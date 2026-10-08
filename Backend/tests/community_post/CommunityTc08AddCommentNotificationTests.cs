using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc08AddCommentNotificationTests
    {
        [Fact]
        public void AddComment_AddsComment_AndDispatchesPushNotificationToAuthor()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 5, Title = "Pipe Repair", UserId = "author@workio.lk" });

            var controller = new CommunityPostsController(mockRepo, mockPush);
            var commentReq = new CreateCommentRequest
            {
                Content = "I can fix this tomorrow morning!",
                UserEmail = "worker@workio.lk",
                UserName = "Kamal Perera"
            };

            var result = controller.AddComment(5, commentReq);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var comment = Assert.IsType<CommunityComment>(okResult.Value);
            Assert.Equal("I can fix this tomorrow morning!", comment.Content);

            // Verify notification sent to post author
            Assert.Contains(mockPush.SentNotifications, n => n.recipient == "author@workio.lk");
        }
    }
}
