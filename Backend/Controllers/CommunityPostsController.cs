using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Security.Claims;
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

            string userId = !string.IsNullOrWhiteSpace(request.UserEmail) ? request.UserEmail :
                            !string.IsNullOrWhiteSpace(request.UserId) ? request.UserId :
                            GetEmailFromRequest() ?? User.Identity?.Name ?? request.UserName ?? "demo_user_1";

            var created = _repository.CreatePost(request, userId);
            return CreatedAtAction(nameof(GetPostById), new { id = created.PostId }, created);
        }

        private string? GetEmailFromRequest()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email || c.Type == "email")?.Value;
            if (!string.IsNullOrEmpty(claim)) return claim;

            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();
                    var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                    var jwtToken = handler.ReadJwtToken(token);
                    return jwtToken.Claims.FirstOrDefault(c => c.Type == "email" || c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
                }
                catch { }
            }
            return null;
        }

        private bool IsAuthor(CommunityPost post, string? requesterId, string? requesterEmail, string? requesterName)
        {
            if (post == null) return false;
            
            var cleanEmail = !string.IsNullOrWhiteSpace(requesterEmail) ? System.Uri.UnescapeDataString(requesterEmail).Trim().ToLower() : "";
            var cleanReqId = !string.IsNullOrWhiteSpace(requesterId) ? System.Uri.UnescapeDataString(requesterId).Trim().ToLower() : "";
            var cleanReqName = !string.IsNullOrWhiteSpace(requesterName) ? requesterName.Trim().ToLower() : "";
            var emailPrefix = cleanEmail.Contains("@") ? cleanEmail.Split('@')[0] : cleanEmail;

            var postUserId = post.UserId != null ? post.UserId.Trim().ToLower() : "";
            var postUserName = post.UserName != null ? post.UserName.Trim().ToLower() : "";

            if (!string.IsNullOrEmpty(cleanEmail) && postUserId == cleanEmail) return true;
            if (!string.IsNullOrEmpty(cleanReqId) && postUserId == cleanReqId) return true;
            if (!string.IsNullOrEmpty(cleanEmail) && postUserId == emailPrefix) return true;
            if (!string.IsNullOrEmpty(cleanReqName) && postUserName == cleanReqName) return true;
            if (!string.IsNullOrEmpty(emailPrefix) && postUserName == emailPrefix) return true;

            // Allow fallback if no specific user bound during legacy creation
            if (string.IsNullOrEmpty(post.UserId) || post.UserId == "demo_user_1") return true;

            return false;
        }

        // PUT /api/community-posts/{id}
        [HttpPut("{id}")]
        public IActionResult UpdatePost(int id, [FromBody] UpdatePostRequest request)
        {
            var post = _repository.GetPostById(id);
            if (post == null) return NotFound(new { message = "Post not found." });

            string? requesterEmail = request.UserEmail ?? GetEmailFromRequest();
            string requesterId = request.UserId ?? requesterEmail ?? User.Identity?.Name ?? "demo_user_1";

            if (!IsAuthor(post, requesterId, requesterEmail, request.UserName))
            {
                return StatusCode(403, new { message = "Forbidden: Only the post author can edit this post." });
            }

            var updated = _repository.UpdatePost(id, request, requesterId);
            if (updated == null) return NotFound(new { message = "Post not found." });
            return Ok(updated);
        }

        // DELETE /api/community-posts/{id}
        [HttpDelete("{id}")]
        public IActionResult DeletePost(int id, [FromQuery] string? requesterEmail, [FromQuery] string? requesterName)
        {
            var post = _repository.GetPostById(id);
            if (post == null) return NotFound(new { message = "Post not found." });

            string? email = requesterEmail ?? GetEmailFromRequest();
            string requesterId = email ?? User.Identity?.Name ?? "demo_user_1";

            if (!IsAuthor(post, requesterId, email, requesterName))
            {
                return StatusCode(403, new { message = "Forbidden: Only the post author can delete this post." });
            }

            bool success = _repository.DeletePost(id, requesterId);
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
