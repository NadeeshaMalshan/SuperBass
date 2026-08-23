using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Superbass.Models
{
    public class Conversation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ResidentEmail { get; set; } = null!;

        [ForeignKey(nameof(ResidentEmail))]
        public Resident? Resident { get; set; }

        [Required]
        public int WorkerId { get; set; }

        [ForeignKey(nameof(WorkerId))]
        public Worker? Worker { get; set; }

        public int? BookingId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? LastMessage { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public string? LastSenderEmail { get; set; }
        public string? LastSenderRole { get; set; } // "Resident" or "Worker"

        public List<ChatMessage> Messages { get; set; } = new();
    }
}
