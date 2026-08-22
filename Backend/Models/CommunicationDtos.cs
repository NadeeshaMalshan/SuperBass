using System;
using System.Collections.Generic;

namespace Superbass.Models
{
    public class CreateConversationRequest
    {
        public int WorkerId { get; set; }
        public string? WorkerEmail { get; set; }
        public string? WorkerName { get; set; }
        public string? WorkerAvatar { get; set; }
        public string? ResidentEmail { get; set; }
        public int? BookingId { get; set; }
        public string? InitialMessage { get; set; }
    }

    public class SendMessageRequest
    {
        public string? SenderEmail { get; set; }
        public string? SenderRole { get; set; } // "Resident" or "Worker"
        public string? MessageType { get; set; } = "Text"; // "Text", "Image", "Attachment", "BookingUpdate"
        public string Content { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long? AttachmentSize { get; set; }
    }

    public class MarkReadRequest
    {
        public string? ReaderEmail { get; set; }
    }

    public class ConversationSummaryDto
    {
        public int Id { get; set; }
        public string ResidentEmail { get; set; } = null!;
        public string? ResidentName { get; set; }
        public string? ResidentPhone { get; set; }
        public int WorkerId { get; set; }
        public string WorkerName { get; set; } = null!;
        public string WorkerEmail { get; set; } = null!;
        public string? WorkerPhone { get; set; }
        public string? WorkerProfileImage { get; set; }
        public int? BookingId { get; set; }
        public string? LastMessage { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public string? LastSenderEmail { get; set; }
        public string? LastSenderRole { get; set; }
        public int UnreadCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ChatMessageDto
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public string SenderEmail { get; set; } = null!;
        public string SenderRole { get; set; } = null!;
        public string MessageType { get; set; } = "Text";
        public string Content { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long? AttachmentSize { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public bool IsDeleted { get; set; }
    }

    public class ConversationDetailsDto
    {
        public int Id { get; set; }
        public string ResidentEmail { get; set; } = null!;
        public string? ResidentName { get; set; }
        public string? ResidentPhone { get; set; }
        public int WorkerId { get; set; }
        public string WorkerName { get; set; } = null!;
        public string WorkerEmail { get; set; } = null!;
        public string? WorkerPhone { get; set; }
        public string? WorkerProfileImage { get; set; }
        public int? BookingId { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ChatMessageDto> Messages { get; set; } = new();
    }
}
