using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Superbass.Models;
using Superbass.Services;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Superbass.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ResidentsController : ControllerBase
    {
        private readonly IResidentRepository _repository;

        public ResidentsController(IResidentRepository repository)
        {
            _repository = repository;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProfile(string id)
        {
            var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
            if (string.IsNullOrEmpty(emailClaim) || emailClaim != id) return Forbid();

            var resident = await _repository.GetResidentAsync(id);
            if (resident == null) return NotFound(new { message = "User not found." });

            return Ok(resident);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(string id, [FromBody] ResidentUpdateDto updateDto)
        {
            var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
            if (string.IsNullOrEmpty(emailClaim) || emailClaim != id) return Forbid();

            var updated = await _repository.UpdateResidentAsync(id, updateDto);
            if (!updated) return NotFound(new { message = "User not found." });

            return Ok(new { message = "Profile updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProfile(string id)
        {
            var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
            if (string.IsNullOrEmpty(emailClaim) || emailClaim != id) return Forbid();

            var deleted = await _repository.DeleteResidentAsync(id);
            if (!deleted) return NotFound(new { message = "User not found." });

            return Ok(new { message = "Account deleted successfully." });
        }
    }
}
