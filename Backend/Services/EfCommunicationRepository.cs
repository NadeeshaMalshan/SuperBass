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
            CreateConversationRequest request,
            string residentEmail)
        {
            // Prevent workers from initiating conversation with other workers
            var isSenderWorker = await _context.Workers.AnyAsync(w => 
                w.Email == residentEmail || w.ResidentEmail == residentEmail);
            if (isSenderWorker)
            {
                throw new InvalidOperationException("Workers cannot initiate direct chats with other workers. Chatting is only permitted between residents and workers.");
            }

            Worker? worker = null;

            if (request.WorkerId > 0)
            {
                worker = await _context.Workers.FindAsync(request.WorkerId);
            }

            if (worker == null && !string.IsNullOrWhiteSpace(request.WorkerEmail))
            {
                worker = await _context.Workers.FirstOrDefaultAsync(w => 
                    w.Email == request.WorkerEmail || w.ResidentEmail == request.WorkerEmail);
            }

            if (worker == null)
            {
                // Ensure a Resident entry exists for the worker
                var workerEmail = !string.IsNullOrWhiteSpace(request.WorkerEmail) 
                    ? request.WorkerEmail 
                    : $"worker{DateTime.UtcNow.Ticks}@superbass.lk";

                var workerResident = await _context.Residents.FindAsync(workerEmail);
                if (workerResident == null)
                {
                    workerResident = new Resident
                    {
                        Email = workerEmail,
                        Name = request.WorkerName ?? "SuperBass Worker",
                        PhoneNo = "0771234567"
                    };
                    _context.Residents.Add(workerResident);
                    await _context.SaveChangesAsync();
                }

                // Create a Worker profile
                worker = new Worker
                {
                    ResidentEmail = workerEmail,
                    Email = workerEmail,
                    Name = request.WorkerName ?? workerResident.Name ?? "Worker",
                    ProfileImage = request.WorkerAvatar,
                    Description = "Verified Community Service Professional",
                    PrimaryServiceArea = "Colombo",
                    IsAvailable = true,
                    OverallRating = 5.0
                };
                _context.Workers.Add(worker);
                await _context.SaveChangesAsync();
            }

            // Ensure Resident profile exists for sender
            var resident = await _context.Residents.FindAsync(residentEmail);
            if (resident == null)
            {
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
                .Where(c => c.ResidentEmail == residentEmail && c.WorkerId == worker.Id);

            if (request.BookingId.HasValue)
            {
                query = query.Where(c => c.BookingId == request.BookingId.Value);
            }

            var conversation = await query.FirstOrDefaultAsync();

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    ResidentEmail = residentEmail,
                    WorkerId = worker.Id,
                    BookingId = request.BookingId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();

                // If initial message provided, save it
                if (!string.IsNullOrWhiteSpace(request.InitialMessage))
                {
                    var msg = new ChatMessage
                    {
                        ConversationId = conversation.Id,
                        SenderEmail = residentEmail,
                        SenderRole = "Resident",
                        ReceiverEmail = worker.Email ?? worker.ResidentEmail,
                        ReceiverRole = "Worker",
                        MessageType = "Text",
                        Content = request.InitialMessage.Trim(),
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
                .Where(c => (c.ResidentEmail == userEmail && !c.IsDeletedByResident) || (workerId.HasValue && c.WorkerId == workerId.Value && !c.IsDeletedByWorker))
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            var summaries = new List<ConversationSummaryDto>();
            foreach (var conv in conversations)
            {
                summaries.Add(await MapToSummaryDtoAsync(conv, userEmail));
            }

            return summaries;
        }

        public async Task<bool> SoftDeleteConversationAsync(int conversationId, string userEmail)
        {
            var conv = await _context.Conversations
                .Include(c => c.Worker)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conv == null) return false;

            var isResident = string.Equals(conv.ResidentEmail, userEmail, StringComparison.OrdinalIgnoreCase);
            var isWorker = conv.Worker != null && (
                string.Equals(conv.Worker.ResidentEmail, userEmail, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(conv.Worker.Email, userEmail, StringComparison.OrdinalIgnoreCase));

            if (!isResident && !isWorker)
            {
                return false;
            }

            if (isResident)
            {
                conv.IsDeletedByResident = true;
            }
            if (isWorker)
            {
                conv.IsDeletedByWorker = true;
            }

            await _context.SaveChangesAsync();
            return true;
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
                    ReceiverEmail = m.ReceiverEmail,
                    ReceiverRole = m.ReceiverRole,
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

            var isUserWorker = conv.Worker != null && (
                string.Equals(conv.Worker.ResidentEmail, userEmail, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(conv.Worker.Email, userEmail, StringComparison.OrdinalIgnoreCase));
            var otherEmail = isUserWorker ? conv.ResidentEmail : (conv.Worker?.Email ?? conv.Worker?.ResidentEmail ?? string.Empty);

            var residentWorker = await _context.Workers.AsNoTracking().FirstOrDefaultAsync(w => 
                w.ResidentEmail == conv.ResidentEmail || w.Email == conv.ResidentEmail);

            var cleanResidentName = conv.Resident?.Name;
            if (string.IsNullOrWhiteSpace(cleanResidentName) || cleanResidentName.Contains('@') || cleanResidentName == conv.ResidentEmail.Split('@')[0])
            {
                if (!string.IsNullOrWhiteSpace(residentWorker?.Name))
                {
                    cleanResidentName = residentWorker.Name;
                }
            }

            var residentProfileImage = residentWorker?.ProfileImage;

            return new ConversationDetailsDto
            {
                Id = conv.Id,
                ResidentEmail = conv.ResidentEmail,
                ResidentName = cleanResidentName ?? conv.Resident?.Name ?? conv.ResidentEmail.Split('@')[0],
                ResidentPhone = conv.Resident?.PhoneNo,
                ResidentProfileImage = residentProfileImage,
                WorkerId = conv.WorkerId,
                WorkerName = conv.Worker?.Name ?? "Worker",
                WorkerEmail = conv.Worker?.Email ?? string.Empty,
                WorkerPhone = conv.Worker?.PhoneNo,
                WorkerProfileImage = conv.Worker?.ProfileImage,
                BookingId = conv.BookingId,
                IsOnline = ChatHub.IsUserOnline(otherEmail),
                LastSeenAt = ChatHub.GetLastSeen(otherEmail),
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
                    ReceiverEmail = m.ReceiverEmail,
                    ReceiverRole = m.ReceiverRole,
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

            // Determine receiver automatically if not provided
            string receiverEmail = request.ReceiverEmail ?? string.Empty;
            string receiverRole = request.ReceiverRole ?? string.Empty;

            if (string.IsNullOrWhiteSpace(receiverEmail))
            {
                if (senderEmail.Equals(conversation.ResidentEmail, StringComparison.OrdinalIgnoreCase))
                {
                    receiverEmail = conversation.Worker?.Email ?? conversation.Worker?.ResidentEmail ?? "worker@superbass.lk";
                    receiverRole = "Worker";
                }
                else
                {
                    receiverEmail = conversation.ResidentEmail;
                    receiverRole = "Resident";
                }
            }

            var message = new ChatMessage
            {
                ConversationId = conversationId,
                SenderEmail = senderEmail,
                SenderRole = string.IsNullOrWhiteSpace(senderRole) ? "Resident" : senderRole,
                ReceiverEmail = receiverEmail,
                ReceiverRole = string.IsNullOrWhiteSpace(receiverRole) ? (senderRole == "Resident" ? "Worker" : "Resident") : receiverRole,
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
            
            // Restore visibility for both parties if it was deleted
            conversation.IsDeletedByResident = false;
            conversation.IsDeletedByWorker = false;

            await _context.SaveChangesAsync();

            return new ChatMessageDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderEmail = message.SenderEmail,
                SenderRole = message.SenderRole,
                ReceiverEmail = message.ReceiverEmail,
                ReceiverRole = message.ReceiverRole,
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
            var lowerEmail = readerEmail.Trim().ToLower();
            var unreadMessages = await _context.ChatMessages
                .Where(m => m.ConversationId == conversationId && !m.IsRead && m.SenderEmail.ToLower() != lowerEmail)
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

        public async Task<bool> DeleteMessagesAsync(List<int> messageIds, string userEmail)
        {
            if (messageIds == null || !messageIds.Any()) return false;

            var messages = await _context.ChatMessages
                .Where(m => messageIds.Contains(m.Id))
                .ToListAsync();

            if (!messages.Any()) return false;

            var now = DateTime.UtcNow;

            var conversationIds = messages.Select(m => m.ConversationId).Distinct().ToList();

            foreach (var message in messages)
            {
                if (!string.Equals(message.SenderEmail, userEmail, StringComparison.OrdinalIgnoreCase))
                {
                    throw new UnauthorizedAccessException("You can only delete your own messages.");
                }

                if ((now - message.CreatedAt).TotalHours > 24)
                {
                    throw new InvalidOperationException("Messages older than 24 hours cannot be deleted.");
                }
            }

            // Hard delete as requested
            _context.ChatMessages.RemoveRange(messages);
            await _context.SaveChangesAsync();

            // Recalculate LastMessage for affected conversations
            foreach (var cid in conversationIds)
            {
                var conv = await _context.Conversations.FindAsync(cid);
                if (conv != null)
                {
                    var lastMsg = await _context.ChatMessages
                        .Where(m => m.ConversationId == cid && !m.IsDeleted)
                        .OrderByDescending(m => m.CreatedAt)
                        .FirstOrDefaultAsync();

                    if (lastMsg != null)
                    {
                        conv.LastMessage = lastMsg.MessageType == "Image" 
                            ? "📷 [Image]" 
                            : (lastMsg.MessageType == "Attachment" ? "📎 [Attachment]" : lastMsg.Content);
                        conv.LastMessageAt = lastMsg.CreatedAt;
                        conv.LastSenderEmail = lastMsg.SenderEmail;
                        conv.LastSenderRole = lastMsg.SenderRole;
                    }
                    else
                    {
                        conv.LastMessage = "No messages yet";
                        conv.LastMessageAt = conv.CreatedAt; 
                        conv.LastSenderEmail = null;
                        conv.LastSenderRole = null;
                    }
                }
            }
            await _context.SaveChangesAsync();
            
            return true;
        }

        public async Task<int> GetTotalUnreadCountAsync(string userEmail)
        {
            var lowerEmail = userEmail.Trim().ToLower();
            var worker = await _context.Workers.FirstOrDefaultAsync(w => 
                (w.ResidentEmail != null && w.ResidentEmail.ToLower() == lowerEmail) || 
                (w.Email != null && w.Email.ToLower() == lowerEmail));
            int? workerId = worker?.Id;

            var unreadCount = await _context.ChatMessages
                .Include(m => m.Conversation)
                .Where(m => !m.IsRead && !m.IsDeleted && m.SenderEmail.ToLower() != lowerEmail &&
                    (m.Conversation!.ResidentEmail.ToLower() == lowerEmail || (workerId.HasValue && m.Conversation.WorkerId == workerId.Value)))
                .CountAsync();

            return unreadCount;
        }

        private async Task<ConversationSummaryDto> MapToSummaryDtoAsync(Conversation conv, string currentUserEmail)
        {
            var lowerEmail = currentUserEmail.Trim().ToLower();
            var unreadCount = await _context.ChatMessages
                .Where(m => m.ConversationId == conv.Id && !m.IsRead && !m.IsDeleted && m.SenderEmail.ToLower() != lowerEmail)
                .CountAsync();

            var isUserWorker = conv.Worker != null && (
                string.Equals(conv.Worker.ResidentEmail, currentUserEmail, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(conv.Worker.Email, currentUserEmail, StringComparison.OrdinalIgnoreCase));
            var otherEmail = isUserWorker ? conv.ResidentEmail : (conv.Worker?.Email ?? conv.Worker?.ResidentEmail ?? string.Empty);

            var residentWorker = await _context.Workers.AsNoTracking().FirstOrDefaultAsync(w => 
                w.ResidentEmail == conv.ResidentEmail || w.Email == conv.ResidentEmail);

            var cleanResidentName = conv.Resident?.Name;
            if (string.IsNullOrWhiteSpace(cleanResidentName) || cleanResidentName.Contains('@') || cleanResidentName == conv.ResidentEmail.Split('@')[0])
            {
                if (!string.IsNullOrWhiteSpace(residentWorker?.Name))
                {
                    cleanResidentName = residentWorker.Name;
                }
            }

            var residentProfileImage = residentWorker?.ProfileImage;

            return new ConversationSummaryDto
            {
                Id = conv.Id,
                ResidentEmail = conv.ResidentEmail,
                ResidentName = cleanResidentName ?? conv.Resident?.Name ?? conv.ResidentEmail.Split('@')[0],
                ResidentPhone = conv.Resident?.PhoneNo,
                ResidentProfileImage = residentProfileImage,
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
                IsOnline = ChatHub.IsUserOnline(otherEmail),
                LastSeenAt = ChatHub.GetLastSeen(otherEmail),
                CreatedAt = conv.CreatedAt,
                UpdatedAt = conv.UpdatedAt
            };
        }
    }
}
