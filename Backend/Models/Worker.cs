using System.ComponentModel.DataAnnotations;

namespace Superbass.Models
{
    public class Worker
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? PhoneNo { get; set; }
        public string? ProfileImage { get; set; }
        public string? Description { get; set; }
        
        // Location & Service Area
        public string? PrimaryServiceArea { get; set; }
        public double? LocationLat { get; set; } //latitude
        public double? LocationLng { get; set; } //longitude
        public double CoverageRadiusKm { get; set; } = 10.0; //coverage radius in kilometers
        
        // Pricing
        public string PricingModel { get; set; } = "Hourly"; // Hourly, Daily, Fixed
        public decimal? HourlyRate { get; set; }
        public decimal? DailyRate { get; set; }
        
        // Availability
        public bool IsAvailable { get; set; } = true;
        public string? AvailabilityScheduleJson { get; set; } // e.g. Mon-Fri 9am-5pm
        
        // Performance & Ratings (Updated after completed jobs)
        public double OverallRating { get; set; } = 5.0;
        public int QualityRating { get; set; } = 5;
        public int PunctualityRating { get; set; } = 5;
        public int CommunicationRating { get; set; } = 5;
        
        public int CompletedJobs { get; set; } = 0;
        public int CancelledJobs { get; set; } = 0;
        public int AcceptedJobs { get; set; } = 0;
        public int RejectedJobs { get; set; } = 0;
        
        public double AcceptanceRate => (AcceptedJobs + RejectedJobs) > 0 
            ? (double)AcceptedJobs / (AcceptedJobs + RejectedJobs) * 100 
            : 100.0;
            
        public double CompletionRate => (CompletedJobs + CancelledJobs) > 0 
            ? (double)CompletedJobs / (CompletedJobs + CancelledJobs) * 100 
            : 100.0;
        
        public double CancellationRate => (CompletedJobs + CancelledJobs) > 0 
            ? (double)CancelledJobs / (CompletedJobs + CancelledJobs) * 100 
            : 0.0;

        // Navigation property for skills
        public List<WorkerSkill> Skills { get; set; } = new();
    }

    public class WorkerSkill
    {
        [Key]
        public int Id { get; set; }
        public int WorkerId { get; set; }
        [Required]
        public string SkillName { get; set; } = null!; // Plumbing, Electrical, Painting, etc.
        public int ExperienceYears { get; set; } = 1;
    }
}
