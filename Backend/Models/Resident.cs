using System.ComponentModel.DataAnnotations;

namespace Superbass.Models
{
    public class Resident
    {
        [Key]
        public string Email { get; set; } = null!;
        public string? Name { get; set; }
        public string? PasswordHash { get; set; }
        public string? PhoneNo { get; set; }
        public string? Address { get; set; }
        public double? LocationLat { get; set; }
        public double? LocationLng { get; set; }

        public Worker? WorkerProfile { get; set; }
    }
}
