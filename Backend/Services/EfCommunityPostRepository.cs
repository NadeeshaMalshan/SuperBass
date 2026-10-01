using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Superbass.Models;

namespace Superbass.Services
{
    public class EfCommunityPostRepository : ICommunityPostRepository
    {
        private readonly SuperbassDbContext _context;
        private readonly List<ServiceCategory> _categories = new();
        private static readonly InMemoryCommunityPostRepository _fallback = new();

        public EfCommunityPostRepository(SuperbassDbContext context)
        {
            _context = context;
            LoadCategories();
        }

        private bool IsDbAvailable()
        {
            try
            {
                var connStr = _context.Database.GetDbConnection()?.ConnectionString;
                return !string.IsNullOrWhiteSpace(connStr);
            }
            catch
            {
                return false;
            }
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
            if (_categories.Count == 0)
            {
                _categories.AddRange(ServiceCategoryConstants.CategoryDefinitions);
            }
        }

        public IEnumerable<ServiceCategory> GetCategories() => _categories;

        public IEnumerable<CommunityPost> GetPosts(string? search, string? categoryId, string? location, string? sort)
        {
            if (!IsDbAvailable()) return _fallback.GetPosts(search, categoryId, location, sort);

            try
            {
                var query = _context.CommunityPosts.Where(p => p.Status != "Removed");

                if (!string.IsNullOrWhiteSpace(search))
                {
                    string term = search.Trim().ToLower();
                    query = query.Where(p => p.Title.ToLower().Contains(term) || p.Content.ToLower().Contains(term) || p.Location.ToLower().Contains(term));
                }

                if (!string.IsNullOrWhiteSpace(categoryId) && !categoryId.Equals("all", StringComparison.OrdinalIgnoreCase))
                {
                    var cleanCat = categoryId.Trim().ToLower();
                    var normCatId = ServiceCategoryConstants.ToCategoryId(ServiceCategoryConstants.NormalizeCategoryName(categoryId));
                    query = query.Where(p => p.ServiceCategoryId.ToLower() == cleanCat || p.ServiceCategoryId == normCatId || p.ServiceCategoryName.ToLower() == cleanCat);
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on GetPosts: {ex.Message}");
                return _fallback.GetPosts(search, categoryId, location, sort);
            }
        }

        public CommunityPost? GetPostById(int id)
        {
            if (!IsDbAvailable()) return _fallback.GetPostById(id);

            try
            {
                var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == id);
                return (post != null && post.Status != "Removed") ? post : null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on GetPostById: {ex.Message}");
                return _fallback.GetPostById(id);
            }
        }

        public CommunityPost CreatePost(CreatePostRequest request, string userId)
        {
            if (!IsDbAvailable()) return _fallback.CreatePost(request, userId);

            try
            {
                string categoryName = ServiceCategoryConstants.NormalizeCategoryName(request.ServiceCategoryId);
                string categoryId = ServiceCategoryConstants.ToCategoryId(categoryName);

                string? resolvedName = request.UserName;
                string? resolvedAvatar = request.UserAvatar;

                if (string.IsNullOrWhiteSpace(resolvedName) || resolvedName == "Community Resident" || resolvedName == "You (Resident)")
                {
                    var res = _context.Residents.FirstOrDefault(r => r.Email == userId);
                    if (res != null && !string.IsNullOrWhiteSpace(res.Name))
                    {
                        resolvedName = res.Name;
                    }
                    else
                    {
                        var worker = _context.Workers.FirstOrDefault(w => w.ResidentEmail == userId || w.Email == userId);
                        if (worker != null && !string.IsNullOrWhiteSpace(worker.Name))
                        {
                            resolvedName = worker.Name;
                            if (string.IsNullOrWhiteSpace(resolvedAvatar) && !string.IsNullOrWhiteSpace(worker.ProfileImage))
                            {
                                resolvedAvatar = worker.ProfileImage;
                            }
                        }
                    }
                }

                if (string.IsNullOrWhiteSpace(resolvedName))
                {
                    resolvedName = userId.Contains("@") ? userId.Split('@')[0] : "Community Resident";
                }

                if (string.IsNullOrWhiteSpace(resolvedAvatar))
                {
                    resolvedAvatar = $"https://api.dicebear.com/7.x/avataaars/svg?seed={userId}";
                }

                var post = new CommunityPost
                {
                    UserId = userId,
                    UserName = resolvedName,
                    UserAvatar = resolvedAvatar,
                    Title = request.Title,
                    Content = request.Content,
                    ServiceCategoryId = categoryId,
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on CreatePost: {ex.Message}");
                return _fallback.CreatePost(request, userId);
            }
        }

        public CommunityPost? UpdatePost(int id, UpdatePostRequest request, string userId)
        {
            if (!IsDbAvailable()) return _fallback.UpdatePost(id, request, userId);

            try
            {
                var post = _context.CommunityPosts.FirstOrDefault(p => p.PostId == id);
                if (post == null) return null;

                string categoryName = !string.IsNullOrWhiteSpace(request.ServiceCategoryId)
                    ? ServiceCategoryConstants.NormalizeCategoryName(request.ServiceCategoryId)
                    : post.ServiceCategoryName;
                string categoryId = ServiceCategoryConstants.ToCategoryId(categoryName);

                post.Title = request.Title;
                post.Content = request.Content;
                post.ServiceCategoryId = categoryId;
                post.ServiceCategoryName = categoryName;
                post.Location = request.Location;
                if (request.Images != null) post.Images = request.Images;
                post.UpdatedAt = DateTime.UtcNow;

                _context.SaveChanges();

                return post;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on UpdatePost: {ex.Message}");
                return _fallback.UpdatePost(id, request, userId);
            }
        }

        public bool DeletePost(int id, string userId)
        {
            if (!IsDbAvailable()) return _fallback.DeletePost(id, userId);

            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on DeletePost: {ex.Message}");
                return _fallback.DeletePost(id, userId);
            }
        }

        public IEnumerable<CommunityComment> GetComments(int postId)
        {
            if (!IsDbAvailable()) return _fallback.GetComments(postId);

            try
            {
                return _context.CommunityComments.Where(c => c.PostId == postId).OrderBy(c => c.CreatedAt).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on GetComments: {ex.Message}");
                return _fallback.GetComments(postId);
            }
        }

        public CommunityComment AddComment(int postId, CreateCommentRequest request, string userId)
        {
            if (!IsDbAvailable()) return _fallback.AddComment(postId, request, userId);

            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on AddComment: {ex.Message}");
                return _fallback.AddComment(postId, request, userId);
            }
        }

        public (bool Success, bool IsLiked, int LikesCount) ToggleLike(int postId, string userId)
        {
            if (!IsDbAvailable()) return _fallback.ToggleLike(postId, userId);

            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on ToggleLike: {ex.Message}");
                return _fallback.ToggleLike(postId, userId);
            }
        }

        public bool ReportPost(int postId, ReportPostRequest request, string userId)
        {
            if (!IsDbAvailable()) return _fallback.ReportPost(postId, request, userId);

            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on ReportPost: {ex.Message}");
                return _fallback.ReportPost(postId, request, userId);
            }
        }

        public IEnumerable<CommunityPost> GetModerationQueue()
        {
            if (!IsDbAvailable()) return _fallback.GetModerationQueue();

            try
            {
                return _context.CommunityPosts.Where(p => p.Status == "Reported" || p.ReportCount > 0).OrderByDescending(p => p.ReportCount).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on GetModerationQueue: {ex.Message}");
                return _fallback.GetModerationQueue();
            }
        }

        public bool UpdatePostStatus(int postId, string status)
        {
            if (!IsDbAvailable()) return _fallback.UpdatePostStatus(postId, status);

            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on UpdatePostStatus: {ex.Message}");
                return _fallback.UpdatePostStatus(postId, status);
            }
        }

        public IEnumerable<CommunityPost> GetPostsByUserId(string userId)
        {
            if (!IsDbAvailable()) return _fallback.GetPostsByUserId(userId);

            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[EfCommunityPostRepository] DB fallback on GetPostsByUserId: {ex.Message}");
                return _fallback.GetPostsByUserId(userId);
            }
        }
    }
}
