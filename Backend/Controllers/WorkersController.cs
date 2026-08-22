using Microsoft.AspNetCore.Mvc;
using Superbass.Models;
using Superbass.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Superbass.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkersController : ControllerBase
    {
        private readonly WorkerRepository _workerRepository;
        private readonly IConfiguration _configuration;

        public WorkersController(WorkerRepository workerRepository, IConfiguration configuration)
        {
            _workerRepository = workerRepository;
            _configuration = configuration;
        }

        // GET: /api/workers
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var workers = await _workerRepository.GetAllWorkersAsync();
            return Ok(workers);
        }

        // GET: /api/workers/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var worker = await _workerRepository.GetWorkerByIdAsync(id);
            if (worker == null) return NotFound(new { message = "Worker not found" });
            return Ok(worker);
        }

        // GET: /api/workers/search?skill=Plumbing&location=Colombo
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? skill, [FromQuery] string? location)
        {
            var results = await _workerRepository.SearchWorkersAsync(skill, location, null);
            return Ok(results);
        }

        // PUT: /api/workers/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Worker worker)
        {
            var updated = await _workerRepository.UpdateWorkerAsync(id, worker);
            if (updated == null) return NotFound(new { message = "Worker not found" });
            return Ok(updated);
        }

        // DELETE: /api/workers/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _workerRepository.DeleteWorkerAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }

                // GET: /api/workers/5/performance
        [HttpGet("{id}/performance")]
        public async Task<IActionResult> GetPerformance(int id)
        {
            var worker = await _workerRepository.GetWorkerByIdAsync(id);
            if (worker == null) return NotFound();

            return Ok(new
            {
                worker.Id,
                worker.Name,
                worker.OverallRating,
                worker.QualityRating,
                worker.PunctualityRating,
                worker.CommunicationRating,
                worker.CompletedJobs,
                worker.CancelledJobs,
                AcceptanceRate = $"{worker.AcceptanceRate:F1}%",
                CompletionRate = $"{worker.CompletionRate:F1}%",
                CancellationRate = $"{worker.CancellationRate:F1}%" 
            });
        }


        // POST /api/workers/{id}/skills
        [HttpPost("{id}/skills")]
        public async Task<IActionResult> AddSkill(int id, [FromBody] WorkerSkill skill)
        {
            var created = await _workerRepository.AddSkillAsync(id, skill);
            if (created == null) return NotFound();
            return Ok(created);
        }

        // DELETE /api/workers/{id}/skills/{skillId}
        [HttpDelete("{id}/skills/{skillId}")]
        public async Task<IActionResult> RemoveSkill(int id, int skillId)
        {
            var success = await _workerRepository.RemoveSkillAsync(id, skillId);
            if (!success) return NotFound();
            return NoContent();
        }

        // PUT /api/workers/{id}/availability
        [HttpPut("{id}/availability")]
        public async Task<IActionResult> UpdateAvailability(int id, [FromBody] AvailabilityUpdateDto dto)
        {
            var success = await _workerRepository.UpdateAvailabilityAsync(id, dto.IsAvailable, dto.ScheduleJson);
            if (!success) return NotFound();
            return Ok(new { message = "Availability updated successfully" });
        }

        // PUT /api/workers/{id}/pricing
        [HttpPut("{id}/pricing")]
        public async Task<IActionResult> UpdatePricing(int id, [FromBody] PricingUpdateDto dto)
        {
            var success = await _workerRepository.UpdatePricingAsync(id, dto.PricingModel, dto.HourlyRate, dto.DailyRate);
            if (!success) return NotFound();
            return Ok(new { message = "Pricing updated successfully" });
        }

        // PUT /api/workers/{id}/service-area
        [HttpPut("{id}/service-area")]
        public async Task<IActionResult> UpdateServiceArea(int id, [FromBody] ServiceAreaUpdateDto dto)
        {
            var success = await _workerRepository.UpdateServiceAreaAsync(id, dto.ServiceArea, dto.RadiusKm);
            if (!success) return NotFound();
            return Ok(new { message = "Service area updated successfully" });
        }

        // PUT /api/workers/{id}/password
        [HttpPut("{id}/password")]
        public async Task<IActionResult> UpdatePassword(int id, [FromBody] PasswordUpdateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword)) return BadRequest(new { message = "New password is required" });
            var success = await _workerRepository.UpdatePasswordAsync(id, dto.NewPassword);
            if (!success) return NotFound();
            return Ok(new { message = "Password updated successfully" });
        }
        // GET: /api/workers/me
        [HttpGet("me")]
        public async Task<IActionResult> GetMyWorkerProfile([FromQuery] string? email)
        {
            var targetEmail = email ?? GetEmailFromRequest();
            if (string.IsNullOrEmpty(targetEmail))
            {
                return BadRequest(new { message = "Email is required or must be provided in Authorization header." });
            }

            var worker = await _workerRepository.GetWorkerByEmailAsync(targetEmail);
            if (worker == null)
            {
                return NotFound(new { message = "User is not a worker.", activeRole = "Resident" });
            }

            return Ok(new { worker, activeRole = "Worker" });
        }

        // POST: /api/workers/become-worker
        [HttpPost("become-worker")]
        public async Task<IActionResult> BecomeWorker([FromBody] BecomeWorkerDto dto)
        {
            var targetEmail = dto.Email ?? GetEmailFromRequest();
            if (string.IsNullOrEmpty(targetEmail))
            {
                return BadRequest(new { message = "Email is required in payload or Authorization header." });
            }

            try
            {
                var skills = dto.Skills.Select(s => new WorkerSkill
                {
                    SkillName = s.SkillName,
                    ExperienceYears = s.ExperienceYears
                }).ToList();

                var worker = await _workerRepository.CreateWorkerFromResidentAsync(
                    targetEmail,
                    dto.Description,
                    dto.PrimaryServiceArea,
                    dto.CoverageRadiusKm,
                    dto.PricingModel,
                    dto.HourlyRate,
                    dto.DailyRate,
                    skills
                );

                return CreatedAtAction(nameof(GetById), new { id = worker.Id }, new { worker, activeRole = "Worker", message = "Successfully upgraded to Worker." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: /api/workers/revert-to-resident
        [HttpDelete("revert-to-resident")]
        public async Task<IActionResult> RevertToResident([FromQuery] string? email)
        {
            var targetEmail = email ?? GetEmailFromRequest();
            if (string.IsNullOrEmpty(targetEmail))
            {
                return BadRequest(new { message = "Email is required or must be provided in Authorization header." });
            }

            var success = await _workerRepository.DeleteWorkerByEmailAsync(targetEmail);
            if (!success)
            {
                return NotFound(new { message = "Worker record not found for this user." });
            }

            return Ok(new { message = "Worker profile deleted successfully. User reverted to Resident.", activeRole = "Resident" });
        }

        private string? GetEmailFromRequest()
        {
            var emailClaim = User?.FindFirst(ClaimTypes.Email)?.Value ?? User?.FindFirst("email")?.Value;
            if (!string.IsNullOrEmpty(emailClaim)) return emailClaim;

            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (authHeader != null && authHeader.StartsWith("Bearer "))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["Authentication:Jwt:Secret"] ?? "super_secret_key_that_must_be_long_enough_12345");
                
                try
                {
                    tokenHandler.ValidateToken(token, new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ClockSkew = TimeSpan.Zero
                    }, out SecurityToken validatedToken);

                    var jwtToken = (JwtSecurityToken)validatedToken;
                    var claim = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Email || x.Type == "email" || x.Type.Contains("emailaddress"));
                    if (claim != null) return claim.Value;
                }
                catch
                {
                    // Ignore token parse errors and fall through
                }
            }

            return null;
        }

        // DTOs for new endpoints
        public class BecomeWorkerDto
        {
            public string? Email { get; set; }
            public string? Description { get; set; }
            public string PrimaryServiceArea { get; set; } = "Default Area";
            public double CoverageRadiusKm { get; set; } = 10.0;
            public string PricingModel { get; set; } = "Hourly";
            public decimal? HourlyRate { get; set; }
            public decimal? DailyRate { get; set; }
            public List<WorkerSkillDto> Skills { get; set; } = new();
        }

        public class WorkerSkillDto
        {
            public string SkillName { get; set; } = null!;
            public int ExperienceYears { get; set; } = 1;
        }

        public class AvailabilityUpdateDto
        {
            public bool IsAvailable { get; set; }
            public string? ScheduleJson { get; set; }
        }

        public class PricingUpdateDto
        {
            public string PricingModel { get; set; } = string.Empty;
            public decimal? HourlyRate { get; set; }
            public decimal? DailyRate { get; set; }
        }

        public class ServiceAreaUpdateDto
        {
            public string ServiceArea { get; set; } = string.Empty;
            public double RadiusKm { get; set; }
        }

        public class PasswordUpdateDto
        {
            public string NewPassword { get; set; } = string.Empty;
        }
    }
}
