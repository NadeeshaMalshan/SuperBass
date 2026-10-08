using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Superbass.Models;
using Superbass.Services;

namespace Superbass.Tests.CommunityPostTests
{
    public class FakePushNotificationService : IPushNotificationService
    {
        public List<(string recipient, string title, string message)> SentNotifications { get; } = new();

        public Task SendPushNotificationAsync(string recipientEmail, string title, string message, Dictionary<string, string>? data = null)
        {
            SentNotifications.Add((recipientEmail, title, message));
            return Task.CompletedTask;
        }
    }

    public class MockCommunityPostRepository : ICommunityPostRepository
    {
        public List<CommunityPost> Posts { get; set; } = new();
        public List<CommunityComment> Comments { get; set; } = new();
        public List<ServiceCategory> Categories { get; set; } = new();
        public List<CommunityPost> ModerationQueue { get; set; } = new();

        public MockCommunityPostRepository()
        {
            Categories.Add(new ServiceCategory { Id = "Plumbing", Name = "Plumbing" });
            Categories.Add(new ServiceCategory { Id = "Electrical", Name = "Electrical" });
        }

        public IEnumerable<ServiceCategory> GetCategories() => Categories;

        public IEnumerable<CommunityPost> GetPosts(string? search, string? categoryId, string? location, string? sort)
        {
            var query = Posts.AsEnumerable();
            if (!string.IsNullOrEmpty(search)) query = query.Where(p => p.Title.Contains(search, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrEmpty(categoryId) && categoryId != "All") query = query.Where(p => p.ServiceCategoryId.Equals(categoryId, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrEmpty(location)) query = query.Where(p => p.Location.Contains(location, StringComparison.OrdinalIgnoreCase));
            return query.ToList();
        }

        public CommunityPost? GetPostById(int id) => Posts.FirstOrDefault(p => p.PostId == id);

        public IEnumerable<CommunityPost> GetPostsByUserId(string userId) => Posts.Where(p => p.UserId == userId).ToList();

        public CommunityPost CreatePost(CreatePostRequest request, string userId)
        {
            var post = new CommunityPost
            {
                PostId = Posts.Count > 0 ? Posts.Max(p => p.PostId) + 1 : 1,
                Title = request.Title,
                Content = request.Content,
                ServiceCategoryId = request.ServiceCategoryId ?? "General",
                Location = request.Location ?? "Colombo",
                UserId = userId,
                UserName = request.UserName ?? userId,
                CreatedAt = DateTime.UtcNow,
                LikesCount = 0,
                CommentsCount = 0
            };
            Posts.Add(post);
            return post;
        }

        public CommunityPost? UpdatePost(int id, UpdatePostRequest request, string userId)
        {
            var post = GetPostById(id);
            if (post == null) return null;
            post.Title = request.Title;
            post.Content = request.Content;
            if (!string.IsNullOrEmpty(request.ServiceCategoryId)) post.ServiceCategoryId = request.ServiceCategoryId;
            return post;
        }

        public bool DeletePost(int id, string userId)
        {
            var post = GetPostById(id);
            if (post == null) return false;
            return Posts.Remove(post);
        }

        public IEnumerable<CommunityComment> GetComments(int postId) => Comments.Where(c => c.PostId == postId).ToList();

        public CommunityComment AddComment(int postId, CreateCommentRequest request, string userId)
        {
            var post = GetPostById(postId);
            if (post == null) throw new KeyNotFoundException("Post not found");

            var comment = new CommunityComment
            {
                CommentId = Comments.Count + 1,
                PostId = postId,
                Content = request.Content,
                UserId = userId,
                UserName = request.UserName ?? userId,
                CreatedAt = DateTime.UtcNow
            };
            Comments.Add(comment);
            post.CommentsCount++;
            return comment;
        }

        public (bool Success, bool IsLiked, int LikesCount) ToggleLike(int postId, string userId)
        {
            var post = GetPostById(postId);
            if (post == null) return (false, false, 0);

            if (post.LikedByUsers.Contains(userId))
            {
                post.LikedByUsers.Remove(userId);
                post.LikesCount = Math.Max(0, post.LikesCount - 1);
                return (true, false, post.LikesCount);
            }
            else
            {
                post.LikedByUsers.Add(userId);
                post.LikesCount++;
                return (true, true, post.LikesCount);
            }
        }

        public bool ReportPost(int postId, ReportPostRequest request, string userId)
        {
            var post = GetPostById(postId);
            if (post == null) return false;
            ModerationQueue.Add(post);
            return true;
        }

        public IEnumerable<CommunityPost> GetModerationQueue() => ModerationQueue;

        public bool UpdatePostStatus(int postId, string status)
        {
            var post = GetPostById(postId);
            if (post == null) return false;
            post.Status = status;
            return true;
        }
    }
}
