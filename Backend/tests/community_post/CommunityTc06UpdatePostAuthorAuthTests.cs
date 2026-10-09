using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc06UpdatePostAuthorAuthTests
    {
        [Fact]
        public void UpdatePost_ReturnsOk_WhenRequesterIsAuthor()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 10, Title = "Old Title", Content = "Old Content", UserId = "author@workio.lk" });

            var controller = new CommunityPostsController(mockRepo, mockPush);
            var updateReq = new UpdatePostRequest
            {
                Title = "New Title",
                Content = "New Content",
                UserEmail = "author@workio.lk"
            };

            var result = controller.UpdatePost(10, updateReq);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var updated = Assert.IsType<CommunityPost>(okResult.Value);
            Assert.Equal("New Title", updated.Title);
        }

        [Fact]
        public void UpdatePost_ReturnsForbidden403_WhenRequesterIsNotAuthor()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 10, Title = "Author Post", UserId = "author@workio.lk" });

            var controller = new CommunityPostsController(mockRepo, mockPush);
            var updateReq = new UpdatePostRequest
            {
                Title = "Hacked Title",
                Content = "Content",
                UserEmail = "stranger@workio.lk"
            };

            var result = controller.UpdatePost(10, updateReq);

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusResult.StatusCode);
        }
    }
}
