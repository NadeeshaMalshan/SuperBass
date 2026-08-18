using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Superbass.Models;
using Superbass.Dtos;

namespace Superbass.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly SuperbassDbContext _db;
        public UsersController(SuperbassDbContext db) => _db = db;

        private string? CurrentUserEmail =>
            User.FindFirstValue(ClaimTypes.Email);

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            if (CurrentUserEmail is null) return Unauthorized();
            var resident = await _db.Residents
                .FirstOrDefaultAsync(r => r.Email == CurrentUserEmail && !r.IsDeleted);
            if (resident is null) return NotFound();
            return Ok(resident);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateUserDto dto)
        {
            if (CurrentUserEmail is null) return Unauthorized();
            var resident = await _db.Residents
                .FirstOrDefaultAsync(r => r.Email == CurrentUserEmail && !r.IsDeleted);
            if (resident is null) return NotFound();

            if (dto.Name != null) resident.Name = dto.Name;
            if (dto.PhoneNumber != null) resident.PhoneNumber = dto.PhoneNumber;
            if (dto.Address != null) resident.Address = dto.Address;
            resident.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(resident);
        }

        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMe([FromBody] DeleteAccountDto dto)
        {
            if (dto.ConfirmationText != "DELETE")
                return BadRequest(new { message = "Confirmation text does not match." });

            if (CurrentUserEmail is null) return Unauthorized();
            var resident = await _db.Residents
                .FirstOrDefaultAsync(r => r.Email == CurrentUserEmail && !r.IsDeleted);
            if (resident is null) return NotFound();

            resident.IsDeleted = true;
            resident.DeletedAt = DateTime.UtcNow;
            resident.PhoneNumber = null;
            resident.Address = null;
            resident.LocationLat = null;
            resident.LocationLng = null;
            // Keep Name and Email as-is so existing bookings/reviews still display something sensible,
            // or anonymize if your privacy requirements need it — your call as a team.

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}