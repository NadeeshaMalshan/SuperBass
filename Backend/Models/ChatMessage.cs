using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Superbass.Models
{
    public class ChatMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ConversationId { get; set; }

        [ForeignKey(nameof(ConversationId))]
        public Conversation? Conversation { get; set; }

        [Required]
        public string SenderEmail { get; set; } = null!;

        [Required]
        public string SenderRole { get; set; } = "Resident"; // "Resident" or "Worker" or "System"

        public string? ReceiverEmail { get; set; }
        public string? ReceiverRole { get; set; } // "Resident" or "Worker"

        public string MessageType { get; set; } = "Text"; // "Text", "Image", "Attachment", "System", "BookingUpdate"

        public string Content { get; set; } = string.Empty;

        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public long? AttachmentSize { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsRead { get; set; } = false;
        public DateTime? ReadAt { get; set; }

        public bool IsDeleted { get; set; } = false;
    }
}
