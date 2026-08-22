using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Superbass.Models;

namespace Superbass.Services
{
    public class EfCommunicationRepository : ICommunicationRepository
    {
        private readonly SuperbassDbContext _context;

        public EfCommunicationRepository(SuperbassDbContext context)
        {
            _context = context;
        }

        public async Task<ConversationSummaryDto> GetOrCreateConversationAsync(
            string residentEmail, 
            int workerId, 
            int? bookingId = null, 
            string? initialMessage = null)
        {
            var worker = await _context.Workers.FindAsync(workerId);
            if (worker == null)
            {
                throw new ArgumentException($"Worker with ID {workerId} not found.");
            }

            var resident = await _context.Residents.FindAsync(residentEmail);
            if (resident == null)
            {
                // If resident not found in Residents table, create a minimal stub
                resident = new Resident
                {
                    Email = residentEmail,
                    Name = residentEmail.Split('@')[0]
                };
                _context.Residents.Add(resident);
                await _context.SaveChangesAsync();
            }

            // Find existing conversation
            var query = _context.Conversations
                .Include(c => c.Resident)
                .Include(c => c.Worker)
                .Where(c => c.ResidentEmail == residentEmail && c.WorkerId == workerId);

            if (bookingId.HasValue)
            {
                query = query.Where(c => c.BookingId == bookingId);
            }

            var conversation = await query.FirstOrDefaultAsync();

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    ResidentEmail = residentEmail,
                    WorkerId = workerId,
                    BookingId = bookingId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();

                // If initial message provided, save it
                if (!string.IsNullOrWhiteSpace(initialMessage))
                {
                    var msg = new ChatMessage
                    {
                        ConversationId = conversation.Id,
                        SenderEmail = residentEmail,
                        SenderRole = "Resident",
                        MessageType = "Text",
                        Content = initialMessage.Trim(),
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    };

                    _context.ChatMessages.Add(msg);
                    conversation.LastMessage = msg.Content;
                    conversation.LastMessageAt = msg.CreatedAt;
                    conversation.LastSenderEmail = msg.SenderEmail;
                    conversation.LastSenderRole = msg.SenderRole;
                    conversation.UpdatedAt = msg.CreatedAt;

                    await _context.SaveChangesAsync();
                }
            }

            return await MapToSummaryDtoAsync(conversation, residentEmail);
        }

        public async Task<List<ConversationSummaryDto>> GetUserConversationsAsync(string userEmail)
        {
            // Find worker profiles associated with this email
            var worker = await _context.Workers.FirstOrDefaultAsync(w => w.ResidentEmail == userEmail || w.Email == userEmail);
            int? workerId = worker?.Id;

            var conversations = await _context.Conversations
                .Include(c => c.Resident)
                .Include(c => c.Worker)
                .Where(c => c.ResidentEmail == userEmail || (workerId.HasValue && c.WorkerId == workerId.Value))
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            var summaries = new List<ConversationSummaryDto>();
            foreach (var conv in conversations)
            {
                summaries.Add(await MapToSummaryDtoAsync(conv, userEmail));
            }

            return summaries;
        }

        public async Task<ConversationDetailsDto?> GetConversationByIdAsync(int conversationId, string userEmail)
        {
            var conv = await _context.Conversations
                .Include(c => c.Resident)
                .Include(c => c.Worker)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conv == null) return null;

            // Security check: verify user is participant
            var isResident = string.Equals(conv.ResidentEmail, userEmail, StringComparison.OrdinalIgnoreCase);
            var isWorker = conv.Worker != null && (
                string.Equals(conv.Worker.ResidentEmail, userEmail, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(conv.Worker.Email, userEmail, StringComparison.OrdinalIgnoreCase));

            if (!isResident && !isWorker)
            {
                return null;
            }

            var messages = await _context.ChatMessages
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .OrderBy(m => m.CreatedAt)
                .Take(100)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    ConversationId = m.ConversationId,
                    SenderEmail = m.SenderEmail,
                    SenderRole = m.SenderRole,
                    MessageType = m.MessageType,
                    Content = m.Content,
                    AttachmentUrl = m.AttachmentUrl,
                    AttachmentName = m.AttachmentName,
                    AttachmentSize = m.AttachmentSize,
                    CreatedAt = m.CreatedAt,
                    IsRead = m.IsRead,
                    ReadAt = m.ReadAt,
                    IsDeleted = m.IsDeleted
                })
                .ToListAsync();

            return new ConversationDetailsDto
            {
                Id = conv.Id,
                ResidentEmail = conv.ResidentEmail,
                ResidentName = conv.Resident?.Name,
                ResidentPhone = conv.Resident?.PhoneNo,
                WorkerId = conv.WorkerId,
                WorkerName = conv.Worker?.Name ?? "Worker",
                WorkerEmail = conv.Worker?.Email ?? string.Empty,
                WorkerPhone = conv.Worker?.PhoneNo,
                WorkerProfileImage = conv.Worker?.ProfileImage,
                BookingId = conv.BookingId,
                CreatedAt = conv.CreatedAt,
                Messages = messages
            };
        }

        public async Task<List<ChatMessageDto>> GetMessagesAsync(int conversationId, string userEmail, int page = 1, int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var messages = await _context.ChatMessages
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    ConversationId = m.ConversationId,
                    SenderEmail = m.SenderEmail,
                    SenderRole = m.SenderRole,
                    MessageType = m.MessageType,
                    Content = m.Content,
                    AttachmentUrl = m.AttachmentUrl,
                    AttachmentName = m.AttachmentName,
                    AttachmentSize = m.AttachmentSize,
                    CreatedAt = m.CreatedAt,
                    IsRead = m.IsRead,
                    ReadAt = m.ReadAt,
                    IsDeleted = m.IsDeleted
                })
                .ToListAsync();

            return messages;
        }

        public async Task<ChatMessageDto> SendMessageAsync(
            int conversationId, 
            string senderEmail, 
            string senderRole, 
            SendMessageRequest request)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Worker)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
            {
                throw new KeyNotFoundException($"Conversation with ID {conversationId} not found.");
            }

            var message = new ChatMessage
            {
                ConversationId = conversationId,
                SenderEmail = senderEmail,
                SenderRole = string.IsNullOrWhiteSpace(senderRole) ? "Resident" : senderRole,
                MessageType = string.IsNullOrWhiteSpace(request.MessageType) ? "Text" : request.MessageType,
                Content = request.Content ?? string.Empty,
                AttachmentUrl = request.AttachmentUrl,
                AttachmentName = request.AttachmentName,
                AttachmentSize = request.AttachmentSize,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                IsDeleted = false
            };

            _context.ChatMessages.Add(message);

            // Update conversation snippet
            conversation.LastMessage = message.MessageType == "Image" 
                ? "📷 [Image]" 
                : (message.MessageType == "Attachment" ? "📎 [Attachment]" : message.Content);
            conversation.LastMessageAt = message.CreatedAt;
            conversation.LastSenderEmail = message.SenderEmail;
            conversation.LastSenderRole = message.SenderRole;
            conversation.UpdatedAt = message.CreatedAt;

            await _context.SaveChangesAsync();

            return new ChatMessageDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderEmail = message.SenderEmail,
                SenderRole = message.SenderRole,
                MessageType = message.MessageType,
                Content = message.Content,
                AttachmentUrl = message.AttachmentUrl,
                AttachmentName = message.AttachmentName,
                AttachmentSize = message.AttachmentSize,
                CreatedAt = message.CreatedAt,
                IsRead = message.IsRead,
                ReadAt = message.ReadAt,
                IsDeleted = message.IsDeleted
            };
        }

        public async Task<bool> MarkConversationAsReadAsync(int conversationId, string readerEmail)
        {
            var unreadMessages = await _context.ChatMessages
                .Where(m => m.ConversationId == conversationId && !m.IsRead && m.SenderEmail != readerEmail)
                .ToListAsync();

            if (!unreadMessages.Any()) return false;

            var now = DateTime.UtcNow;
            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
                msg.ReadAt = now;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteMessageAsync(int messageId, string userEmail)
        {
            var message = await _context.ChatMessages.FindAsync(messageId);
            if (message == null) return false;

            if (!string.Equals(message.SenderEmail, userEmail, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("You can only delete your own messages.");
            }

            message.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> GetTotalUnreadCountAsync(string userEmail)
        {
            var worker = await _context.Workers.FirstOrDefaultAsync(w => w.ResidentEmail == userEmail || w.Email == userEmail);
            int? workerId = worker?.Id;

            var unreadCount = await _context.ChatMessages
                .Include(m => m.Conversation)
                .Where(m => !m.IsRead && !m.IsDeleted && m.SenderEmail != userEmail &&
                    (m.Conversation!.ResidentEmail == userEmail || (workerId.HasValue && m.Conversation.WorkerId == workerId.Value)))
                .CountAsync();

            return unreadCount;
        }

        private async Task<ConversationSummaryDto> MapToSummaryDtoAsync(Conversation conv, string currentUserEmail)
        {
            var unreadCount = await _context.ChatMessages
                .Where(m => m.ConversationId == conv.Id && !m.IsRead && !m.IsDeleted && m.SenderEmail != currentUserEmail)
                .CountAsync();

            return new ConversationSummaryDto
            {
                Id = conv.Id,
                ResidentEmail = conv.ResidentEmail,
                ResidentName = conv.Resident?.Name,
                ResidentPhone = conv.Resident?.PhoneNo,
                WorkerId = conv.WorkerId,
                WorkerName = conv.Worker?.Name ?? "Worker",
                WorkerEmail = conv.Worker?.Email ?? string.Empty,
                WorkerPhone = conv.Worker?.PhoneNo,
                WorkerProfileImage = conv.Worker?.ProfileImage,
                BookingId = conv.BookingId,
                LastMessage = conv.LastMessage,
                LastMessageAt = conv.LastMessageAt,
                LastSenderEmail = conv.LastSenderEmail,
                LastSenderRole = conv.LastSenderRole,
                UnreadCount = unreadCount,
                CreatedAt = conv.CreatedAt,
                UpdatedAt = conv.UpdatedAt
            };
        }
    }
}
