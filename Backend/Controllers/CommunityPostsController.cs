using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using Superbass.Models;
using Superbass.Services;

namespace Superbass.Controllers
{
    [Route("api/community-posts")]
    [ApiController]
    public class CommunityPostsController : ControllerBase
    {
        private readonly ICommunityPostRepository _repository;

        public CommunityPostsController(ICommunityPostRepository repository)
        {
            _repository = repository;
        }

        // GET /api/community-posts/categories
        [HttpGet("categories")]
        public IActionResult GetCategories()
        {
            var categories = _repository.GetCategories();
            return Ok(categories);
        }

        // GET /api/community-posts?search=&category=&location=&sort=
        [HttpGet]
        public IActionResult GetPosts([FromQuery] string? search, [FromQuery] string? category, [FromQuery] string? location, [FromQuery] string? sort)
        {
            var posts = _repository.GetPosts(search, category, location, sort);
            return Ok(posts);
        }

        // GET /api/community-posts/user/{email}
        [HttpGet("user/{email}")]
        public IActionResult GetPostsByUser(string email)
        {
            var posts = _repository.GetPostsByUserId(email);
            if (!posts.Any())
            {
                posts = _repository.GetPosts(null, null, null, null)
                    .Where(p => p.UserId == email || p.UserName.Contains(email.Split('@')[0], StringComparison.OrdinalIgnoreCase));
            }
            return Ok(posts);
        }

        // GET /api/community-posts/{id}
        [HttpGet("{id}")]
        public IActionResult GetPostById(int id)
        {
            var post = _repository.GetPostById(id);
            if (post == null) return NotFound(new { message = "Community post not found." });
            return Ok(post);
        }

        // POST /api/community-posts
        [HttpPost]
        public IActionResult CreatePost([FromBody] CreatePostRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { message = "Title and Content are required." });
            }

            string userId = User.Identity?.Name ?? "demo_user_1";
            var created = _repository.CreatePost(request, userId);
            return CreatedAtAction(nameof(GetPostById), new { id = created.PostId }, created);
        }

        // PUT /api/community-posts/{id}
        [HttpPut("{id}")]
        public IActionResult UpdatePost(int id, [FromBody] UpdatePostRequest request)
        {
            string userId = User.Identity?.Name ?? "demo_user_1";
            var updated = _repository.UpdatePost(id, request, userId);
            if (updated == null) return NotFound(new { message = "Post not found or unauthorized." });
            return Ok(updated);
        }

        // DELETE /api/community-posts/{id}
        [HttpDelete("{id}")]
        public IActionResult DeletePost(int id)
        {
            string userId = User.Identity?.Name ?? "demo_user_1";
            bool success = _repository.DeletePost(id, userId);
            if (!success) return NotFound(new { message = "Post not found." });
            return Ok(new { message = "Post deleted successfully." });
        }

        // GET /api/community-posts/{id}/comments
        [HttpGet("{id}/comments")]
        public IActionResult GetComments(int id)
        {
            var comments = _repository.GetComments(id);
            return Ok(comments);
        }

        // POST /api/community-posts/{id}/comments
        [HttpPost("{id}/comments")]
        public IActionResult AddComment(int id, [FromBody] CreateCommentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { message = "Comment content cannot be empty." });
            }

            string userId = User.Identity?.Name ?? "demo_user_1";
            try
            {
                var comment = _repository.AddComment(id, request, userId);
                return Ok(comment);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Post not found." });
            }
        }

        // POST /api/community-posts/{id}/like
        [HttpPost("{id}/like")]
        public IActionResult ToggleLike(int id)
        {
            string userId = User.Identity?.Name ?? "demo_user_1";
            var result = _repository.ToggleLike(id, userId);
            if (!result.Success) return NotFound(new { message = "Post not found." });

            return Ok(new { isLiked = result.IsLiked, likesCount = result.LikesCount });
        }

        // POST /api/community-posts/{id}/report
        [HttpPost("{id}/report")]
        public IActionResult ReportPost(int id, [FromBody] ReportPostRequest request)
        {
            string userId = User.Identity?.Name ?? "demo_user_1";
            bool success = _repository.ReportPost(id, request, userId);
            if (!success) return NotFound(new { message = "Post not found." });

            return Ok(new { message = "Post reported to moderators successfully." });
        }

        // GET /api/community-posts/moderation
        [HttpGet("moderation")]
        public IActionResult GetModerationQueue()
        {
            var queue = _repository.GetModerationQueue();
            return Ok(queue);
        }

        // PUT /api/community-posts/{id}/status
        [HttpPut("{id}/status")]
        public IActionResult UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
        {
            bool success = _repository.UpdatePostStatus(id, request.Status);
            if (!success) return NotFound(new { message = "Post not found." });

            return Ok(new { message = $"Post status updated to {request.Status}." });
        }
    }
}
