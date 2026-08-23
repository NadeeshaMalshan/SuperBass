using System;

namespace Superbass.Models
{
    public class CreateBookingRequest
    {
        public int WorkerId { get; set; }
        public string? ResidentEmail { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Urgency { get; set; } = "Medium";
        public DateTime? ScheduledDate { get; set; }
        public string? LocationAddress { get; set; }
        public string? ContactPhone { get; set; }
        public string? PricingModel { get; set; }
        public decimal? EstimatedPrice { get; set; }
    }

    public class UpdateBookingStatusRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }

    public class RescheduleBookingRequest
    {
        public DateTime ScheduledDate { get; set; }
        public string? Note { get; set; }
    }

    public class ReviewBookingRequest
    {
        public int QualityRating { get; set; } = 5;
        public int PunctualityRating { get; set; } = 5;
        public int CommunicationRating { get; set; } = 5;
        public string? Comment { get; set; }
    }

    public class BookingResponseDto
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
        public string JobTitle { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Urgency { get; set; } = "Medium";
        public DateTime ScheduledDate { get; set; }
        public string LocationAddress { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string PricingModel { get; set; } = "Hourly";
        public decimal? EstimatedPrice { get; set; }
        public decimal? AgreedPrice { get; set; }
        public string Status { get; set; } = "Requested";
        public string? RejectionReason { get; set; }
        public string? CancellationReason { get; set; }
        public double? ReviewRating { get; set; }
        public int? QualityRating { get; set; }
        public int? PunctualityRating { get; set; }
        public int? CommunicationRating { get; set; }
        public string? ReviewComment { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? ConversationId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
