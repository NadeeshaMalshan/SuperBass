using System;
using System.Collections.Generic;
using System.Linq;

namespace Superbass.Models
{
    public static class ServiceCategoryConstants
    {
        public static readonly List<string> Categories = new()
        {
            "Plumbing",
            "Electrical",
            "Carpentry",
            "Painting",
            "Masonry & Construction",
            "AC & Air Conditioning",
            "Welding",
            "Cleaning",
            "Gardening & Landscaping",
            "Handyman Services",
            "Vehicle Repair & Mechanic",
            "Roofing",
            "Glass & Window Services",
            "Locksmith",
            "Appliance Repair",
            "Computer & IT Services",
            "Phone Repair",
            "Moving & Transport",
            "Furniture Repair & Assembly",
            "Pest Control",
            "Others"
        };

        public static readonly List<ServiceCategory> CategoryDefinitions = new()
        {
            new ServiceCategory { Id = "plumbing", Name = "Plumbing", Icon = "fa-faucet-drip" },
            new ServiceCategory { Id = "electrical", Name = "Electrical", Icon = "fa-bolt" },
            new ServiceCategory { Id = "carpentry", Name = "Carpentry", Icon = "fa-hammer" },
            new ServiceCategory { Id = "painting", Name = "Painting", Icon = "fa-paint-roller" },
            new ServiceCategory { Id = "masonry-construction", Name = "Masonry & Construction", Icon = "fa-trowel-bricks" },
            new ServiceCategory { Id = "ac-air-conditioning", Name = "AC & Air Conditioning", Icon = "fa-snowflake" },
            new ServiceCategory { Id = "welding", Name = "Welding", Icon = "fa-fire-burner" },
            new ServiceCategory { Id = "cleaning", Name = "Cleaning", Icon = "fa-broom" },
            new ServiceCategory { Id = "gardening-landscaping", Name = "Gardening & Landscaping", Icon = "fa-seedling" },
            new ServiceCategory { Id = "handyman-services", Name = "Handyman Services", Icon = "fa-toolbox" },
            new ServiceCategory { Id = "vehicle-repair-mechanic", Name = "Vehicle Repair & Mechanic", Icon = "fa-wrench" },
            new ServiceCategory { Id = "roofing", Name = "Roofing", Icon = "fa-house-chimney" },
            new ServiceCategory { Id = "glass-window-services", Name = "Glass & Window Services", Icon = "fa-window-maximize" },
            new ServiceCategory { Id = "locksmith", Name = "Locksmith", Icon = "fa-key" },
            new ServiceCategory { Id = "appliance-repair", Name = "Appliance Repair", Icon = "fa-screwdriver-wrench" },
            new ServiceCategory { Id = "computer-it-services", Name = "Computer & IT Services", Icon = "fa-laptop-code" },
            new ServiceCategory { Id = "phone-repair", Name = "Phone Repair", Icon = "fa-mobile-screen-button" },
            new ServiceCategory { Id = "moving-transport", Name = "Moving & Transport", Icon = "fa-truck-ramp-box" },
            new ServiceCategory { Id = "furniture-repair-assembly", Name = "Furniture Repair & Assembly", Icon = "fa-couch" },
            new ServiceCategory { Id = "pest-control", Name = "Pest Control", Icon = "fa-shield-halved" },
            new ServiceCategory { Id = "others", Name = "Others", Icon = "fa-circle-question" }
        };

        public static bool IsValidCategory(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return false;
            var trimmed = input.Trim();

            // Check exact or case-insensitive match against category names
            if (Categories.Any(c => c.Equals(trimmed, StringComparison.OrdinalIgnoreCase)))
                return true;

            // Check match against category IDs
            if (CategoryDefinitions.Any(c => c.Id.Equals(trimmed, StringComparison.OrdinalIgnoreCase)))
                return true;

            // Handle common legacy aliases
            var normalized = trimmed.ToLowerInvariant()
                .Replace("&", "and")
                .Replace(" ", "-");
            if (CategoryDefinitions.Any(c => c.Id.Replace("&", "and").Equals(normalized, StringComparison.OrdinalIgnoreCase)))
                return true;

            return false;
        }

        public static string NormalizeCategoryName(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return "Others";
            var trimmed = input.Trim();

            var exactMatch = Categories.FirstOrDefault(c => c.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
            if (exactMatch != null) return exactMatch;

            var idMatch = CategoryDefinitions.FirstOrDefault(c => c.Id.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
            if (idMatch != null) return idMatch.Name;

            // Check prefix/contains fallback
            var looseMatch = Categories.FirstOrDefault(c =>
                c.ToLowerInvariant().Contains(trimmed.ToLowerInvariant()) ||
                trimmed.ToLowerInvariant().Contains(c.ToLowerInvariant()));
            if (looseMatch != null) return looseMatch;

            return "Others";
        }

        public static string ToCategoryId(string categoryName)
        {
            var def = CategoryDefinitions.FirstOrDefault(c => c.Name.Equals(categoryName, StringComparison.OrdinalIgnoreCase));
            if (def != null) return def.Id;

            return categoryName.Trim().ToLowerInvariant()
                .Replace(" & ", "-")
                .Replace("&", "-")
                .Replace(" ", "-");
        }
    }
}
