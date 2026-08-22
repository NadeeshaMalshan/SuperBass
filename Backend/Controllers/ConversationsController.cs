using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Superbass.Models;
using Superbass.Services;

namespace Superbass.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConversationsController : ControllerBase
    {
        private readonly ICommunicationRepository _communicationRepo;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IWebHostEnvironment _environment;

        public ConversationsController(
            ICommunicationRepository communicationRepo,
            IHubContext<ChatHub> hubContext,
            IWebHostEnvironment environment)
        {
            _communicationRepo = communicationRepo;
            _hubContext = hubContext;
            _environment = environment;
        }

        private string? GetCurrentUserEmail()
        {
            var email = User.FindFirstValue(ClaimTypes.Email) 
                     ?? User.FindFirstValue("email") 
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return email;
        }

        // GET: /api/conversations?userEmail=test@example.com
        [HttpGet]
        public async Task<IActionResult> GetConversations([FromQuery] string? userEmail)
        {
            var email = userEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "User email must be provided or present in JWT claims." });
            }

            var conversations = await _communicationRepo.GetUserConversationsAsync(email);
            return Ok(conversations);
        }

        // GET: /api/conversations/5?userEmail=test@example.com
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetConversationById(int id, [FromQuery] string? userEmail)
        {
            var email = userEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "User email must be provided or present in JWT claims." });
            }

            var conversation = await _communicationRepo.GetConversationByIdAsync(id, email);
            if (conversation == null)
            {
                return NotFound(new { message = "Conversation not found or access denied." });
            }

            return Ok(conversation);
        }

        // POST: /api/conversations
        [HttpPost]
        public async Task<IActionResult> CreateOrGetConversation([FromBody] CreateConversationRequest request)
        {
            if (request == null || request.WorkerId <= 0)
            {
                return BadRequest(new { message = "Valid workerId is required." });
            }

            var residentEmail = request.ResidentEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(residentEmail))
            {
                return BadRequest(new { message = "Resident email must be provided or present in JWT claims." });
            }

            try
            {
                var summary = await _communicationRepo.GetOrCreateConversationAsync(
                    residentEmail, 
                    request.WorkerId, 
                    request.BookingId, 
                    request.InitialMessage);

                return Ok(summary);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // GET: /api/conversations/5/messages?page=1&pageSize=50
        [HttpGet("{id:int}/messages")]
        public async Task<IActionResult> GetMessages(int id, [FromQuery] string? userEmail, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var email = userEmail ?? GetCurrentUserEmail() ?? string.Empty;
            var messages = await _communicationRepo.GetMessagesAsync(id, email, page, pageSize);
            return Ok(messages);
        }

        // POST: /api/conversations/5/messages
        [HttpPost("{id:int}/messages")]
        [HttpPost("{id:int}/message")]
        public async Task<IActionResult> SendMessage(int id, [FromBody] SendMessageRequest request)
        {
            if (request == null || (string.IsNullOrWhiteSpace(request.Content) && string.IsNullOrWhiteSpace(request.AttachmentUrl)))
            {
                return BadRequest(new { message = "Message content or attachment URL is required." });
            }

            var senderEmail = request.SenderEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(senderEmail))
            {
                return BadRequest(new { message = "Sender email must be provided or present in JWT claims." });
            }

            var senderRole = request.SenderRole ?? "Resident";

            try
            {
                var messageDto = await _communicationRepo.SendMessageAsync(id, senderEmail, senderRole, request);

                // Broadcast via SignalR to room
                var groupName = $"conversation_{id}";
                await _hubContext.Clients.Group(groupName).SendAsync("ReceiveMessage", messageDto);

                return Ok(messageDto);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // PUT: /api/conversations/5/read
        [HttpPut("{id:int}/read")]
        public async Task<IActionResult> MarkRead(int id, [FromBody] MarkReadRequest? request)
        {
            var readerEmail = request?.ReaderEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(readerEmail))
            {
                return BadRequest(new { message = "Reader email is required." });
            }

            var updated = await _communicationRepo.MarkConversationAsReadAsync(id, readerEmail);

            if (updated)
            {
                var groupName = $"conversation_{id}";
                await _hubContext.Clients.Group(groupName).SendAsync("MessagesRead", new 
                { 
                    conversationId = id, 
                    readerEmail 
                });
            }

            return Ok(new { success = true, marked = updated });
        }

        // DELETE: /api/conversations/messages/10?userEmail=test@example.com
        [HttpDelete("messages/{messageId:int}")]
        public async Task<IActionResult> DeleteMessage(int messageId, [FromQuery] string? userEmail)
        {
            var email = userEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "User email is required." });
            }

            try
            {
                var result = await _communicationRepo.DeleteMessageAsync(messageId, email);
                if (!result)
                {
                    return NotFound(new { message = "Message not found." });
                }
                return Ok(new { success = true, message = "Message deleted successfully." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        // GET: /api/conversations/unread-count?userEmail=test@example.com
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount([FromQuery] string? userEmail)
        {
            var email = userEmail ?? GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "User email is required." });
            }

            var count = await _communicationRepo.GetTotalUnreadCountAsync(email);
            return Ok(new { unreadCount = count });
        }

        // POST: /api/conversations/upload
        [HttpPost("upload")]
        public async Task<IActionResult> UploadAttachment(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded." });
            }

            // Max file size 25MB
            if (file.Length > 25 * 1024 * 1024)
            {
                return BadRequest(new { message = "File size exceeds 25MB limit." });
            }

            var uploadDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "chat");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }

            var fileExt = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid():N}{fileExt}";
            var filePath = Path.Combine(uploadDir, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var isImage = file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
            var fileUrl = $"/uploads/chat/{uniqueFileName}";

            return Ok(new
            {
                url = fileUrl,
                fileName = file.FileName,
                fileSize = file.Length,
                isImage,
                contentType = file.ContentType
            });
        }
    }
}
