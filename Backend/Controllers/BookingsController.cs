using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Superbass.Models;
using Superbass.Services;

namespace Superbass.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly SuperbassDbContext _context;
        private readonly ICommunicationRepository _communicationRepo;
        private readonly IHubContext<ChatHub> _hubContext;

        public BookingsController(
            SuperbassDbContext context,
            ICommunicationRepository communicationRepo,
            IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _communicationRepo = communicationRepo;
            _hubContext = hubContext;
        }

        private string? GetCurrentUserEmail()
        {
            var email = User.FindFirstValue(ClaimTypes.Email)
                     ?? User.FindFirstValue("email")
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return email;
        }

        private static BookingResponseDto MapToDto(Booking b)
        {
            return new BookingResponseDto
            {
                Id = b.Id,
                ResidentEmail = b.ResidentEmail,
                ResidentName = b.Resident?.Name ?? b.ResidentEmail.Split('@')[0],
                ResidentPhone = b.Resident?.PhoneNo ?? b.ContactPhone,
                WorkerId = b.WorkerId,
                WorkerName = b.Worker?.Name ?? "Worker",
                WorkerEmail = b.Worker?.Email ?? b.Worker?.ResidentEmail ?? string.Empty,
                WorkerPhone = b.Worker?.PhoneNo,
                WorkerProfileImage = b.Worker?.ProfileImage,
                JobTitle = b.JobTitle,
                Description = b.Description,
                Urgency = b.Urgency,
                ScheduledDate = b.ScheduledDate,
                LocationAddress = b.LocationAddress,
                ContactPhone = b.ContactPhone,
                PricingModel = b.PricingModel,
                EstimatedPrice = b.EstimatedPrice,
                AgreedPrice = b.AgreedPrice,
                Status = b.Status,
                RejectionReason = b.RejectionReason,
                CancellationReason = b.CancellationReason,
                ReviewRating = b.ReviewRating,
                QualityRating = b.QualityRating,
                PunctualityRating = b.PunctualityRating,
                CommunicationRating = b.CommunicationRating,
                ReviewComment = b.ReviewComment,
                ReviewedAt = b.ReviewedAt,
                ConversationId = b.ConversationId,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            };
        }

        // POST: /api/bookings
        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
        {
            if (request == null || request.WorkerId <= 0 || string.IsNullOrWhiteSpace(request.JobTitle))
            {
                return BadRequest(new { message = "Worker ID and Job Title are required." });
            }

            var residentEmail = request.ResidentEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(residentEmail))
            {
                residentEmail = "resident@superbass.lk";
            }

            // Ensure Resident exists
            var resident = await _context.Residents.FindAsync(residentEmail);
            if (resident == null)
            {
                resident = new Resident
                {
                    Email = residentEmail,
                    Name = residentEmail.Split('@')[0],
                    PhoneNo = request.ContactPhone ?? "0771234567"
                };
                _context.Residents.Add(resident);
                await _context.SaveChangesAsync();
            }

            // Ensure Worker exists
            var worker = await _context.Workers.FindAsync(request.WorkerId);
            if (worker == null)
            {
                return NotFound(new { message = $"Worker with ID {request.WorkerId} not found." });
            }

            // Create or Link Conversation
            int? conversationId = null;
            try
            {
                var convSummary = await _communicationRepo.GetOrCreateConversationAsync(new CreateConversationRequest
                {
                    WorkerId = worker.Id,
                    WorkerEmail = worker.Email,
                    WorkerName = worker.Name,
                    WorkerAvatar = worker.ProfileImage,
                    ResidentEmail = residentEmail,
                    InitialMessage = $"New Hire Request: {request.JobTitle} scheduled for {(request.ScheduledDate ?? DateTime.UtcNow.AddDays(1)):dd MMM yyyy, hh:mm tt}."
                }, residentEmail);
                conversationId = convSummary.Id;
            }
            catch (Exception)
            {
                // Fallback: Continue booking creation even if chat linking encounters a non-critical error
            }

            var scheduledUtc = request.ScheduledDate.HasValue 
                ? (request.ScheduledDate.Value.Kind == DateTimeKind.Utc 
                    ? request.ScheduledDate.Value 
                    : DateTime.SpecifyKind(request.ScheduledDate.Value, DateTimeKind.Utc))
                : DateTime.UtcNow.AddDays(1);

            var booking = new Booking
            {
                ResidentEmail = residentEmail,
                WorkerId = worker.Id,
                JobTitle = request.JobTitle,
                Description = request.Description ?? string.Empty,
                Urgency = request.Urgency ?? "Medium",
                ScheduledDate = scheduledUtc,
                LocationAddress = request.LocationAddress ?? resident.Address ?? "Colombo",
                ContactPhone = request.ContactPhone ?? resident.PhoneNo ?? string.Empty,
                PricingModel = request.PricingModel ?? worker.PricingModel ?? "Hourly",
                EstimatedPrice = request.EstimatedPrice ?? (worker.HourlyRate ?? worker.DailyRate),
                Status = "Requested",
                ConversationId = conversationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            // Send notification message inside conversation
            if (conversationId.HasValue)
            {
                try
                {
                    await _communicationRepo.SendMessageAsync(conversationId.Value, residentEmail, "Resident", new SendMessageRequest
                    {
                        SenderEmail = residentEmail,
                        SenderRole = "Resident",
                        MessageType = "BookingUpdate",
                        Content = $"📋 Booking Requested #{booking.Id}: {booking.JobTitle} ({booking.Urgency} Priority)"
                    });
                }
                catch { }
            }

            // Reload with navigations
            var savedBooking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstAsync(b => b.Id == booking.Id);

            return CreatedAtAction(nameof(GetBookingById), new { id = booking.Id }, MapToDto(savedBooking));
        }

        // GET: /api/bookings/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetBookingById(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
            {
                return NotFound(new { message = "Booking not found." });
            }

            return Ok(MapToDto(booking));
        }

        // GET: /api/bookings/resident?email=...
        [HttpGet("resident")]
        public async Task<IActionResult> GetResidentBookings([FromQuery] string? email)
        {
            var userEmail = email ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return BadRequest(new { message = "Resident email is required." });
            }

            var bookings = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .Where(b => b.ResidentEmail == userEmail)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return Ok(bookings.Select(MapToDto));
        }

        // GET: /api/bookings/worker?email=... or ?workerId=...
        [HttpGet("worker")]
        public async Task<IActionResult> GetWorkerBookings([FromQuery] string? email, [FromQuery] int? workerId)
        {
            var query = _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .AsQueryable();

            if (workerId.HasValue && workerId.Value > 0)
            {
                query = query.Where(b => b.WorkerId == workerId.Value);
            }
            else
            {
                var userEmail = email ?? GetCurrentUserEmail();
                if (string.IsNullOrWhiteSpace(userEmail))
                {
                    return BadRequest(new { message = "Worker ID or email is required." });
                }
                query = query.Where(b => b.Worker != null && (b.Worker.Email == userEmail || b.Worker.ResidentEmail == userEmail));
            }

            var bookings = await query.OrderByDescending(b => b.CreatedAt).ToListAsync();
            return Ok(bookings.Select(MapToDto));
        }

        // POST: /api/bookings/{id}/accept
        [HttpPost("{id:int}/accept")]
        public async Task<IActionResult> AcceptBooking(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            booking.Status = "Confirmed";
            booking.UpdatedAt = DateTime.UtcNow;

            if (booking.Worker != null)
            {
                booking.Worker.AcceptedJobs += 1;
            }

            await _context.SaveChangesAsync();

            // Send notification message to conversation
            if (booking.ConversationId.HasValue)
            {
                try
                {
                    await _communicationRepo.SendMessageAsync(booking.ConversationId.Value, booking.Worker?.Email ?? "worker", "Worker", new SendMessageRequest
                    {
                        SenderEmail = booking.Worker?.Email,
                        SenderRole = "Worker",
                        MessageType = "BookingUpdate",
                        Content = $"✅ Booking Confirmed! The worker has accepted your request for {booking.JobTitle}."
                    });
                }
                catch { }
            }

            return Ok(MapToDto(booking));
        }

        // POST: /api/bookings/{id}/reject
        [HttpPost("{id:int}/reject")]
        public async Task<IActionResult> RejectBooking(int id, [FromBody] UpdateBookingStatusRequest? request)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            booking.Status = "Rejected";
            booking.RejectionReason = request?.Reason ?? "Worker unavailable at this time.";
            booking.UpdatedAt = DateTime.UtcNow;

            if (booking.Worker != null)
            {
                booking.Worker.RejectedJobs += 1;
            }

            await _context.SaveChangesAsync();

            if (booking.ConversationId.HasValue)
            {
                try
                {
                    await _communicationRepo.SendMessageAsync(booking.ConversationId.Value, booking.Worker?.Email ?? "worker", "Worker", new SendMessageRequest
                    {
                        SenderEmail = booking.Worker?.Email,
                        SenderRole = "Worker",
                        MessageType = "BookingUpdate",
                        Content = $"❌ Booking Declined: {booking.RejectionReason}"
                    });
                }
                catch { }
            }

            return Ok(MapToDto(booking));
        }

        // POST: /api/bookings/{id}/start
        [HttpPost("{id:int}/start")]
        public async Task<IActionResult> StartBooking(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            booking.Status = "InProgress";
            booking.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (booking.ConversationId.HasValue)
            {
                try
                {
                    await _communicationRepo.SendMessageAsync(booking.ConversationId.Value, booking.Worker?.Email ?? "worker", "Worker", new SendMessageRequest
                    {
                        SenderEmail = booking.Worker?.Email,
                        SenderRole = "Worker",
                        MessageType = "BookingUpdate",
                        Content = $"🚀 Job In Progress: Worker has started working on '{booking.JobTitle}'."
                    });
                }
                catch { }
            }

            return Ok(MapToDto(booking));
        }

        // POST: /api/bookings/{id}/complete
        [HttpPost("{id:int}/complete")]
        public async Task<IActionResult> CompleteBooking(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            booking.Status = "Completed";
            booking.UpdatedAt = DateTime.UtcNow;

            if (booking.Worker != null)
            {
                booking.Worker.CompletedJobs += 1;
            }

            await _context.SaveChangesAsync();

            if (booking.ConversationId.HasValue)
            {
                try
                {
                    await _communicationRepo.SendMessageAsync(booking.ConversationId.Value, booking.Worker?.Email ?? "worker", "Worker", new SendMessageRequest
                    {
                        SenderEmail = booking.Worker?.Email,
                        SenderRole = "Worker",
                        MessageType = "BookingUpdate",
                        Content = $"🎉 Job Completed! Worker has marked '{booking.JobTitle}' as finished. Please leave a rating and review."
                    });
                }
                catch { }
            }

            return Ok(MapToDto(booking));
        }

        // POST: /api/bookings/{id}/cancel
        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> CancelBooking(int id, [FromBody] UpdateBookingStatusRequest? request)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            booking.Status = "Cancelled";
            booking.CancellationReason = request?.Reason ?? "Cancelled by user";
            booking.UpdatedAt = DateTime.UtcNow;

            if (booking.Worker != null)
            {
                booking.Worker.CancelledJobs += 1;
            }

            await _context.SaveChangesAsync();

            return Ok(MapToDto(booking));
        }

        // POST: /api/bookings/{id}/reschedule
        [HttpPost("{id:int}/reschedule")]
        public async Task<IActionResult> RescheduleBooking(int id, [FromBody] RescheduleBookingRequest request)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            var rescheduleUtc = request.ScheduledDate.Kind == DateTimeKind.Utc
                ? request.ScheduledDate
                : DateTime.SpecifyKind(request.ScheduledDate, DateTimeKind.Utc);

            booking.ScheduledDate = rescheduleUtc;
            booking.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (booking.ConversationId.HasValue)
            {
                try
                {
                    await _communicationRepo.SendMessageAsync(booking.ConversationId.Value, booking.ResidentEmail, "Resident", new SendMessageRequest
                    {
                        SenderEmail = booking.ResidentEmail,
                        SenderRole = "Resident",
                        MessageType = "BookingUpdate",
                        Content = $"📅 Booking Rescheduled to: {request.ScheduledDate:dd MMM yyyy, hh:mm tt}. {request.Note}"
                    });
                }
                catch { }
            }

            return Ok(MapToDto(booking));
        }

        // POST: /api/bookings/{id}/review
        [HttpPost("{id:int}/review")]
        public async Task<IActionResult> ReviewBooking(int id, [FromBody] ReviewBookingRequest request)
        {
            var booking = await _context.Bookings
                .Include(b => b.Resident)
                .Include(b => b.Worker)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return NotFound(new { message = "Booking not found." });

            var q = Math.Clamp(request.QualityRating, 1, 5);
            var p = Math.Clamp(request.PunctualityRating, 1, 5);
            var c = Math.Clamp(request.CommunicationRating, 1, 5);
            var avgRating = Math.Round((q + p + c) / 3.0, 1);

            booking.QualityRating = q;
            booking.PunctualityRating = p;
            booking.CommunicationRating = c;
            booking.ReviewRating = avgRating;
            booking.ReviewComment = request.Comment;
            booking.ReviewedAt = DateTime.UtcNow;
            booking.Status = "Reviewed";
            booking.UpdatedAt = DateTime.UtcNow;

            // Recalculate Worker ratings
            if (booking.Worker != null)
            {
                var reviewedBookings = await _context.Bookings
                    .Where(b => b.WorkerId == booking.WorkerId && b.ReviewRating.HasValue)
                    .ToListAsync();

                var totalQuality = reviewedBookings.Sum(b => b.QualityRating ?? 5) + q;
                var totalPunc = reviewedBookings.Sum(b => b.PunctualityRating ?? 5) + p;
                var totalComm = reviewedBookings.Sum(b => b.CommunicationRating ?? 5) + c;
                var count = reviewedBookings.Count + 1;

                booking.Worker.QualityRating = (int)Math.Round((double)totalQuality / count);
                booking.Worker.PunctualityRating = (int)Math.Round((double)totalPunc / count);
                booking.Worker.CommunicationRating = (int)Math.Round((double)totalComm / count);
                booking.Worker.OverallRating = Math.Round(((double)totalQuality / count + (double)totalPunc / count + (double)totalComm / count) / 3.0, 1);
            }

            await _context.SaveChangesAsync();

            if (booking.ConversationId.HasValue)
            {
                try
                {
                    await _communicationRepo.SendMessageAsync(booking.ConversationId.Value, booking.ResidentEmail, "Resident", new SendMessageRequest
                    {
                        SenderEmail = booking.ResidentEmail,
                        SenderRole = "Resident",
                        MessageType = "BookingUpdate",
                        Content = $"⭐ Resident left a {avgRating}★ review: \"{request.Comment}\""
                    });
                }
                catch { }
            }

            return Ok(MapToDto(booking));
        }

        // DELETE: api/bookings/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBooking(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
            {
                return NotFound(new { message = "Booking not found." });
            }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Booking deleted successfully." });
        }
    }
}
