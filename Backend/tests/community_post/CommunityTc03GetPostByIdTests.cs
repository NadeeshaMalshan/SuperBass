using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc03GetPostByIdTests
    {
        [Fact]
        public void GetPostById_ReturnsOk_WhenPostExists()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 99, Title = "Existing Post", Content = "Details" });

            var controller = new CommunityPostsController(mockRepo, mockPush);

            var result = controller.GetPostById(99);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var post = Assert.IsType<CommunityPost>(okResult.Value);
            Assert.Equal(99, post.PostId);
        }

        [Fact]
        public void GetPostById_ReturnsNotFound_WhenPostDoesNotExist()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            var controller = new CommunityPostsController(mockRepo, mockPush);

            var result = controller.GetPostById(999);

            Assert.IsType<NotFoundObjectResult>(result);
        }
    }
}
