using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc05CreatePostSuccessTests
    {
        [Fact]
        public void CreatePost_ReturnsCreatedAtAction_WithValidPost()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            var controller = new CommunityPostsController(mockRepo, mockPush);

            var request = new CreatePostRequest
            {
                Title = "Electrical wiring repair needed",
                Content = "Main switch tripping constantly in house",
                ServiceCategoryId = "Electrical",
                Location = "Colombo",
                UserEmail = "kasun@workio.lk"
            };

            var result = controller.CreatePost(request);

            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var post = Assert.IsType<CommunityPost>(createdResult.Value);
            Assert.Equal("Electrical wiring repair needed", post.Title);
            Assert.Equal("kasun@workio.lk", post.UserId);
        }
    }
}
