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
        public string? Province { get; set; }
        public string? District { get; set; }
        public double? LocationLat { get; set; }
        public double? LocationLng { get; set; }
        public string? ProfileImage { get; set; }
        public bool IsVerified { get; set; } = false;
        public string? NicNumber { get; set; }
    }
}
// This class represents a resident in the Superbass application. It includes properties for the resident's email (primary key), name, password hash, phone number, address, province, district, location coordinates (latitude and longitude), profile image URL, verification status, and National Identity Card (NIC) number. The Email property is marked as the primary key using the [Key] attribute.