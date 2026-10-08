using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc07DeletePostAuthorAuthTests
    {
        [Fact]
        public void DeletePost_ReturnsOk_WhenRequesterIsAuthor()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 20, Title = "To Delete", UserId = "owner@workio.lk" });

            var controller = new CommunityPostsController(mockRepo, mockPush);

            var result = controller.DeletePost(20, requesterEmail: "owner@workio.lk", requesterName: "Owner");

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Empty(mockRepo.Posts);
        }

        [Fact]
        public void DeletePost_ReturnsForbidden403_WhenRequesterIsNotAuthor()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 20, Title = "To Delete", UserId = "owner@workio.lk" });

            var controller = new CommunityPostsController(mockRepo, mockPush);

            var result = controller.DeletePost(20, requesterEmail: "intruder@workio.lk", requesterName: "Intruder");

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusResult.StatusCode);
        }
    }
}
