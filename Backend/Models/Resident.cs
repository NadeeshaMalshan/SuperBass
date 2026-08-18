using System.ComponentModel.DataAnnotations;

namespace Superbass.Models
{
    public class Resident
    {
        [Key]
        public string Email { get; set; } = null!;
        public string? Name { get; set; }
        public string? PasswordHash { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public double? LocationLat { get; set; }
        public double? LocationLng { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
    }
}
