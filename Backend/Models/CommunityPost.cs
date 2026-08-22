using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Superbass.Models
{
    public class CommunityPost
    {
        [Key]
        public int PostId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string UserAvatar { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string ServiceCategoryId { get; set; } = string.Empty;
        public string ServiceCategoryName { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string Status { get; set; } = "Active"; // "Active", "Reported", "Removed"
        public int LikesCount { get; set; } = 0;
        public int CommentsCount { get; set; } = 0;
        public List<string> LikedByUsers { get; set; } = new();
        public int ReportCount { get; set; } = 0;
    }

    public class CommunityComment
    {
        [Key]
        public int CommentId { get; set; }
        public int PostId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string UserAvatar { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CommunityReport
    {
        [Key]
        public int ReportId { get; set; }
        public int PostId { get; set; }
        public string ReporterUserId { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Pending"; // "Pending", "Reviewed", "Dismissed"
    }

    public class ServiceCategory
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
    }

    public class CreatePostRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string ServiceCategoryId { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public List<string>? Images { get; set; }
        public string? UserName { get; set; }
        public string? UserAvatar { get; set; }
        public string? UserEmail { get; set; }
        public string? UserId { get; set; }
    }

    public class UpdatePostRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string ServiceCategoryId { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public List<string>? Images { get; set; }
        public string? UserName { get; set; }
        public string? UserEmail { get; set; }
        public string? UserId { get; set; }
    }

    public class CreateCommentRequest
    {
        public string Content { get; set; } = string.Empty;
        public string? UserName { get; set; }
        public string? UserAvatar { get; set; }
    }

    public class ReportPostRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = "Active"; // "Active", "Removed"
    }
}
