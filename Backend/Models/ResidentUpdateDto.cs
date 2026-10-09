namespace Superbass.Models
{
    public class ResidentUpdateDto
    {
        public string? Name { get; set; }
        public string? PhoneNo { get; set; }
        public string? Address { get; set; }
        
        private double? _lat;
        public double? LocationLat 
        { 
            get => _lat; 
            set => _lat = value; 
        }
        public double? Latitude 
        { 
            get => _lat; 
            set => _lat ??= value; 
        }

        private double? _lng;
        public double? LocationLng 
        { 
            get => _lng; 
            set => _lng = value; 
        }
        public double? Longitude 
        { 
            get => _lng; 
            set => _lng ??= value; 
        }

        public string? ProfileImage { get; set; }
        public string? District { get; set; }
        public bool? IsVerified { get; set; }
        public string? NicNumber { get; set; }
    }
}
// This class represents a Data Transfer Object (DTO) for updating resident information in the Superbass application. It includes properties for the resident's name, phone number, address, location coordinates (latitude and longitude), profile image URL, verification status, and National Identity Card (NIC) number. The properties are nullable to allow partial updates of the resident's profile.