using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Superbass.Models;

namespace Superbass.Services
{
    public class EfCommunityPostRepository : ICommunityPostRepository
    {
        private readonly SuperbassDbContext _context;
        private readonly List<ServiceCategory> _categories = new();

        public EfCommunityPostRepository(SuperbassDbContext context)
        {
            _context = context;
            LoadCategories();
        }

        private void LoadCategories()
        {
            try
            {
                string jsonPath = Path.Combine(AppContext.BaseDirectory, "data", "categories.json");
                if (!File.Exists(jsonPath))
                {
                    jsonPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "categories.json");
                }

                if (File.Exists(jsonPath))
                {
                    string json = File.ReadAllText(jsonPath);
                    var categories = JsonSerializer.Deserialize<List<ServiceCategory>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (categories != null && categories.Count > 0)
                    {
                        _categories.AddRange(categories);
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading categories.json: {ex.Message}");
            }

            // Fallback default categories if json file is unavailable
            _categories.AddRange(new[]
            {
                new ServiceCategory { Id = "plumbing", Name = "Plumbing", Icon = "fa-faucet-drip" },
                new ServiceCategory { Id = "electrical", Name = "Electrical", Icon = "fa-bolt" },
                new ServiceCategory { Id = "carpentry", Name = "Carpentry", Icon = "fa-hammer" },
                new ServiceCategory { Id = "masonry", Name = "Masonry", Icon = "fa-trowel-bricks" },
                new ServiceCategory { Id = "painting", Name = "Painting", Icon = "fa-paint-roller" },
                new ServiceCategory { Id = "ac-repair", Name = "AC Repair", Icon = "fa-snowflake" },
                new ServiceCategory { Id = "roofing", Name = "Roofing", Icon = "fa-house-chimney" },
                new ServiceCategory { Id = "appliance-repair", Name = "Appliance Repair", Icon = "fa-screwdriver-wrench" },
                new ServiceCategory { Id = "cctv-security", Name = "CCTV & Security", Icon = "fa-video" },
                new ServiceCategory { Id = "general", Name = "General Advice", Icon = "fa-circle-info" }
            });
        }

        public IEnumerable<ServiceCategory> GetCategories() => _categories;

        public IEnumerable<CommunityPost> GetPosts(string? search, string? categoryId, string? location, string? sort)
        {
            var query = _context.CommunityPosts.Where(p => p.Status != "Removed");

            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(term) || p.Content.ToLower().Contains(term) || p.Location.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(categoryId) && !categoryId.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.ServiceCategoryId == categoryId);
            }

            if (!string.IsNullOrWhiteSpace(location) && !location.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                string locTerm = location.Trim().ToLower();
                query = query.Where(p => p.Location.ToLower().Contains(locTerm));
            }

            if (!string.IsNullOrWhiteSpace(sort) && sort.Equals("popular", StringComparison.OrdinalIgnoreCase))
            {
                query = query.OrderByDescending(p => p.LikesCount).ThenByDescending(p => p.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(p => p.CreatedAt);
            }

            return query.ToList();
        }

        public CommunityPost? GetPostById(int id)
        {
            var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == id);
            return (post != null && post.Status != "Removed") ? post : null;
        }

        public CommunityPost CreatePost(CreatePostRequest request, string userId)
        {
            var category = _categories.FirstOrDefault(c => c.Id.Equals(request.ServiceCategoryId, StringComparison.OrdinalIgnoreCase));
            string categoryName = category != null ? category.Name : (request.ServiceCategoryId ?? "General Advice");

            var post = new CommunityPost
            {
                UserId = userId,
                UserName = !string.IsNullOrWhiteSpace(request.UserName) ? request.UserName : "Community Resident",
                UserAvatar = !string.IsNullOrWhiteSpace(request.UserAvatar) ? request.UserAvatar : $"https://api.dicebear.com/7.x/avataaars/svg?seed={userId}",
                Title = request.Title,
                Content = request.Content,
                ServiceCategoryId = request.ServiceCategoryId ?? "general",
                ServiceCategoryName = categoryName,
                Location = !string.IsNullOrWhiteSpace(request.Location) ? request.Location : "Colombo",
                Images = request.Images ?? new List<string>(),
                CreatedAt = DateTime.UtcNow,
                Status = "Active",
                LikesCount = 0,
                CommentsCount = 0,
                LikedByUsers = new List<string>()
            };

            _context.CommunityPosts.Add(post);
            _context.SaveChanges();
            
            return post;
        }

        public CommunityPost? UpdatePost(int id, UpdatePostRequest request, string userId)
        {
            var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == id);
            if (post == null) return null;

            var category = _categories.FirstOrDefault(c => c.Id.Equals(request.ServiceCategoryId, StringComparison.OrdinalIgnoreCase));

            post.Title = request.Title;
            post.Content = request.Content;
            post.ServiceCategoryId = request.ServiceCategoryId;
            post.ServiceCategoryName = category?.Name ?? request.ServiceCategoryId;
            post.Location = request.Location;
            if (request.Images != null) post.Images = request.Images;
            post.UpdatedAt = DateTime.UtcNow;

            _context.SaveChanges();

            return post;
        }

        public bool DeletePost(int id, string userId)
        {
            var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == id);
            if (post != null)
            {
                post.Status = "Removed";
                _context.SaveChanges();
                return true;
            }
            return false;
        }

        public IEnumerable<CommunityComment> GetComments(int postId)
        {
            return _context.CommunityComments.Where(c => c.PostId == postId).OrderBy(c => c.CreatedAt).ToList();
        }

        public CommunityComment AddComment(int postId, CreateCommentRequest request, string userId)
        {
            var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == postId);
            if (post == null)
            {
                throw new KeyNotFoundException("Post not found.");
            }

            var comment = new CommunityComment
            {
                PostId = postId,
                UserId = userId,
                UserName = !string.IsNullOrWhiteSpace(request.UserName) ? request.UserName : "Resident",
                UserAvatar = !string.IsNullOrWhiteSpace(request.UserAvatar) ? request.UserAvatar : $"https://api.dicebear.com/7.x/avataaars/svg?seed={userId}",
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            _context.CommunityComments.Add(comment);
            
            post.CommentsCount = _context.CommunityComments.Count(c => c.PostId == postId) + 1;
            
            _context.SaveChanges();

            return comment;
        }

        public (bool Success, bool IsLiked, int LikesCount) ToggleLike(int postId, string userId)
        {
            var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == postId);
            if (post == null) return (false, false, 0);

            bool isLiked;
            var likedUsers = post.LikedByUsers.ToList();
            if (likedUsers.Contains(userId))
            {
                likedUsers.Remove(userId);
                isLiked = false;
            }
            else
            {
                likedUsers.Add(userId);
                isLiked = true;
            }

            post.LikedByUsers = likedUsers;
            post.LikesCount = likedUsers.Count;
            _context.SaveChanges();
            
            return (true, isLiked, post.LikesCount);
        }

        public bool ReportPost(int postId, ReportPostRequest request, string userId)
        {
            var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == postId);
            if (post == null) return false;

            var report = new CommunityReport
            {
                PostId = postId,
                ReporterUserId = userId,
                Reason = request.Reason,
                CreatedAt = DateTime.UtcNow,
                Status = "Pending"
            };

            _context.CommunityReports.Add(report);
            
            post.ReportCount = _context.CommunityReports.Count(r => r.PostId == postId) + 1;
            if (post.Status == "Active")
            {
                post.Status = "Reported";
            }

            _context.SaveChanges();
            
            return true;
        }

        public IEnumerable<CommunityPost> GetModerationQueue()
        {
            return _context.CommunityPosts.Where(p => p.Status == "Reported" || p.ReportCount > 0).OrderByDescending(p => p.ReportCount).ToList();
        }

        public bool UpdatePostStatus(int postId, string status)
        {
            var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == postId);
            if (post != null)
            {
                post.Status = status;
                _context.SaveChanges();
                return true;
            }
            return false;
        }

        public IEnumerable<CommunityPost> GetPostsByUserId(string userId)
        {
            var cleanUserId = System.Uri.UnescapeDataString(userId).Trim();
            var namePrefix = cleanUserId.Contains("@") ? cleanUserId.Split('@')[0] : cleanUserId;

            return _context.CommunityPosts
                .Where(p => p.Status != "Removed" &&
                    (p.UserId == cleanUserId ||
                     p.UserId == userId ||
                     (p.UserId != null && p.UserId.ToLower() == cleanUserId.ToLower()) ||
                     (p.UserName != null && (p.UserName.ToLower() == cleanUserId.ToLower() || p.UserName.ToLower() == namePrefix.ToLower()))))
                .OrderByDescending(p => p.CreatedAt)
                .ToList();
        }
    }
}
