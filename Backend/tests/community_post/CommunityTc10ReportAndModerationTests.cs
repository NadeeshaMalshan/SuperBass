using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc10ReportAndModerationTests
    {
        [Fact]
        public void ReportPost_SubmitsPostToModerationQueue()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 15, Title = "Spam Advertisement", Content = "Suspicious links" });

            var controller = new CommunityPostsController(mockRepo, mockPush)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext()
                }
            };
            var reportReq = new ReportPostRequest { Reason = "Spam or advertising" };

            var result = controller.ReportPost(15, reportReq);

            Assert.IsType<OkObjectResult>(result);
            Assert.Contains(mockRepo.ModerationQueue, p => p.PostId == 15);
        }

        [Fact]
        public void UpdateStatus_UpdatesPostStatusSuccessfully()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 15, Title = "Reported Post", Status = "Active" });

            var controller = new CommunityPostsController(mockRepo, mockPush);
            var statusReq = new UpdateStatusRequest { Status = "Suspended" };

            var result = controller.UpdateStatus(15, statusReq);

            Assert.IsType<OkObjectResult>(result);
            var post = mockRepo.GetPostById(15);
            Assert.Equal("Suspended", post?.Status);
        }
    }
}
