using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Superbass.Models
{
    public class Booking
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

        [Required]
        [MaxLength(200)]
        public string JobTitle { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Urgency { get; set; } = "Medium"; // Low, Medium, High, Emergency

        public DateTime ScheduledDate { get; set; } = DateTime.UtcNow.AddDays(1);

        [MaxLength(250)]
        public string LocationAddress { get; set; } = string.Empty;

        [MaxLength(50)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(50)]
        public string PricingModel { get; set; } = "Hourly"; // Hourly, Daily, Fixed

        public decimal? EstimatedPrice { get; set; }
        public decimal? AgreedPrice { get; set; }

        // Status Lifecycle: "Requested", "Confirmed", "Rejected", "InProgress", "Completed", "Cancelled", "Reviewed"
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Requested";

        public string? RejectionReason { get; set; }
        public string? CancellationReason { get; set; }

        // Review & Rating details
        public double? ReviewRating { get; set; } // 1.0 - 5.0
        public int? QualityRating { get; set; } // 1 - 5
        public int? PunctualityRating { get; set; } // 1 - 5
        public int? CommunicationRating { get; set; } // 1 - 5
        public string? ReviewComment { get; set; }
        public DateTime? ReviewedAt { get; set; }

        // Associated direct chat conversation
        public int? ConversationId { get; set; }

        [ForeignKey(nameof(ConversationId))]
        public Conversation? Conversation { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
