using Microsoft.AspNetCore.Mvc;
using Superbass.Models;
using Superbass.Services;

namespace Superbass.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkersController : ControllerBase
    {
        private readonly WorkerRepository _workerRepository;

        public WorkersController(WorkerRepository workerRepository)
        {
            _workerRepository = workerRepository;
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

        // POST: /api/workers
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Worker worker)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var created = await _workerRepository.CreateWorkerAsync(worker);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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

        // DTOs for new endpoints
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
