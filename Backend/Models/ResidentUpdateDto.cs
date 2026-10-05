namespace Superbass.Models
{
    public class ResidentUpdateDto
    {
        public string? Name { get; set; }
        public string? PhoneNo { get; set; }
        public string? Address { get; set; }
        public double? LocationLat { get; set; }
        public double? LocationLng { get; set; }
        public string? ProfileImage { get; set; }
        public bool? IsVerified { get; set; }
        public string? NicNumber { get; set; }
    }
}
// This class represents a Data Transfer Object (DTO) for updating resident information in the Superbass application. It includes properties for the resident's name, phone number, address, location coordinates (latitude and longitude), profile image URL, verification status, and National Identity Card (NIC) number. The properties are nullable to allow partial updates of the resident's profile.