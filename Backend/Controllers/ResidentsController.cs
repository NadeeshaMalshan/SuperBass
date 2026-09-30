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
            var decodedId = System.Uri.UnescapeDataString(id);
            var resident = await _repository.GetResidentAsync(decodedId) ?? await _repository.GetResidentAsync(id);

            if (resident == null)
            {
                var defaultName = decodedId.Contains("@") ? decodedId.Split('@')[0] : decodedId;
                return Ok(new Resident
                {
                    Email = decodedId,
                    Name = defaultName,
                    PhoneNo = "",
                    Address = ""
                });
            }

            return Ok(resident);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(string id, [FromBody] ResidentUpdateDto updateDto)
        {
            var decodedId = System.Uri.UnescapeDataString(id);
            await _repository.UpdateResidentAsync(decodedId, updateDto);
            return Ok(new { message = "Profile updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProfile(string id)
        {
            var decodedId = System.Uri.UnescapeDataString(id);
            var deleted = await _repository.DeleteResidentAsync(decodedId) || await _repository.DeleteResidentAsync(id);
            if (!deleted) return NotFound(new { message = "User not found." });

            return Ok(new { message = "Account deleted successfully." });
        }
    }
}
