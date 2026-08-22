using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Superbass.Models;

namespace Superbass.Services
{
    public interface ICommunityPostRepository
    {
        IEnumerable<CommunityPost> GetPosts(string? search, string? categoryId, string? location, string? sort);
        CommunityPost? GetPostById(int id);
        CommunityPost CreatePost(CreatePostRequest request, string userId);
        CommunityPost? UpdatePost(int id, UpdatePostRequest request, string userId);
        bool DeletePost(int id, string userId);
        IEnumerable<CommunityComment> GetComments(int postId);
        CommunityComment AddComment(int postId, CreateCommentRequest request, string userId);
        (bool Success, bool IsLiked, int LikesCount) ToggleLike(int postId, string userId);
        bool ReportPost(int postId, ReportPostRequest request, string userId);
        IEnumerable<CommunityPost> GetModerationQueue();
        bool UpdatePostStatus(int postId, string status);
        IEnumerable<ServiceCategory> GetCategories();
        IEnumerable<CommunityPost> GetPostsByUserId(string userId);
    }

    public class InMemoryCommunityPostRepository : ICommunityPostRepository
    {
        private readonly ConcurrentDictionary<int, CommunityPost> _posts = new();
        private readonly ConcurrentDictionary<int, List<CommunityComment>> _comments = new();
        private readonly ConcurrentDictionary<int, List<CommunityReport>> _reports = new();
        private readonly List<ServiceCategory> _categories = new();
        private int _nextPostId = 1;
        private int _nextCommentId = 1;
        private int _nextReportId = 1;

        public InMemoryCommunityPostRepository()
        {
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
            var query = _posts.Values.Where(p => p.Status != "Removed");

            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(term) || p.Content.ToLower().Contains(term) || p.Location.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(categoryId) && !categoryId.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.ServiceCategoryId.Equals(categoryId, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(location) && !location.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.Location.ToLower().Contains(location.Trim().ToLower()));
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
            _posts.TryGetValue(id, out var post);
            return (post != null && post.Status != "Removed") ? post : null;
        }

        public CommunityPost CreatePost(CreatePostRequest request, string userId)
        {
            var category = _categories.FirstOrDefault(c => c.Id.Equals(request.ServiceCategoryId, StringComparison.OrdinalIgnoreCase));
            string categoryName = category != null ? category.Name : (request.ServiceCategoryId ?? "General Advice");

            int id = _nextPostId++;
            var post = new CommunityPost
            {
                PostId = id,
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

            _posts[id] = post;
            _comments[id] = new List<CommunityComment>();
            _reports[id] = new List<CommunityReport>();
            return post;
        }

        public CommunityPost? UpdatePost(int id, UpdatePostRequest request, string userId)
        {
            if (!_posts.TryGetValue(id, out var post)) return null;

            var category = _categories.FirstOrDefault(c => c.Id.Equals(request.ServiceCategoryId, StringComparison.OrdinalIgnoreCase));

            post.Title = request.Title;
            post.Content = request.Content;
            post.ServiceCategoryId = request.ServiceCategoryId;
            post.ServiceCategoryName = category?.Name ?? request.ServiceCategoryId;
            post.Location = request.Location;
            if (request.Images != null) post.Images = request.Images;
            post.UpdatedAt = DateTime.UtcNow;

            return post;
        }

        public bool DeletePost(int id, string userId)
        {
            if (_posts.TryGetValue(id, out var post))
            {
                post.Status = "Removed";
                return true;
            }
            return false;
        }

        public IEnumerable<CommunityComment> GetComments(int postId)
        {
            if (_comments.TryGetValue(postId, out var list))
            {
                return list.OrderBy(c => c.CreatedAt).ToList();
            }
            return Enumerable.Empty<CommunityComment>();
        }

        public CommunityComment AddComment(int postId, CreateCommentRequest request, string userId)
        {
            if (!_posts.TryGetValue(postId, out var post))
            {
                throw new KeyNotFoundException("Post not found.");
            }

            var comment = new CommunityComment
            {
                CommentId = _nextCommentId++,
                PostId = postId,
                UserId = userId,
                UserName = !string.IsNullOrWhiteSpace(request.UserName) ? request.UserName : "Resident",
                UserAvatar = !string.IsNullOrWhiteSpace(request.UserAvatar) ? request.UserAvatar : $"https://api.dicebear.com/7.x/avataaars/svg?seed={userId}",
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            if (!_comments.ContainsKey(postId))
            {
                _comments[postId] = new List<CommunityComment>();
            }

            _comments[postId].Add(comment);
            post.CommentsCount = _comments[postId].Count;

            return comment;
        }

        public (bool Success, bool IsLiked, int LikesCount) ToggleLike(int postId, string userId)
        {
            if (!_posts.TryGetValue(postId, out var post)) return (false, false, 0);

            bool isLiked;
            if (post.LikedByUsers.Contains(userId))
            {
                post.LikedByUsers.Remove(userId);
                isLiked = false;
            }
            else
            {
                post.LikedByUsers.Add(userId);
                isLiked = true;
            }

            post.LikesCount = post.LikedByUsers.Count;
            return (true, isLiked, post.LikesCount);
        }

        public bool ReportPost(int postId, ReportPostRequest request, string userId)
        {
            if (!_posts.TryGetValue(postId, out var post)) return false;

            var report = new CommunityReport
            {
                ReportId = _nextReportId++,
                PostId = postId,
                ReporterUserId = userId,
                Reason = request.Reason,
                CreatedAt = DateTime.UtcNow,
                Status = "Pending"
            };

            if (!_reports.ContainsKey(postId))
            {
                _reports[postId] = new List<CommunityReport>();
            }

            _reports[postId].Add(report);
            post.ReportCount = _reports[postId].Count;
            if (post.Status == "Active")
            {
                post.Status = "Reported";
            }

            return true;
        }

        public IEnumerable<CommunityPost> GetModerationQueue()
        {
            return _posts.Values.Where(p => p.Status == "Reported" || p.ReportCount > 0).OrderByDescending(p => p.ReportCount).ToList();
        }

        public bool UpdatePostStatus(int postId, string status)
        {
            if (_posts.TryGetValue(postId, out var post))
            {
                post.Status = status;
                return true;
            }
            return false;
        }

        public IEnumerable<CommunityPost> GetPostsByUserId(string userId)
        {
            var cleanUserId = System.Uri.UnescapeDataString(userId).Trim();
            var namePrefix = cleanUserId.Contains("@") ? cleanUserId.Split('@')[0] : cleanUserId;

            return _posts.Values
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
