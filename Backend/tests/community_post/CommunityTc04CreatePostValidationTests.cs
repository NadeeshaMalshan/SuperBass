using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc04CreatePostValidationTests
    {
        [Theory]
        [InlineData("", "Content provided")]
        [InlineData("Title provided", "")]
        [InlineData(" ", " ")]
        public void CreatePost_ReturnsBadRequest_WhenTitleOrContentIsEmpty(string title, string content)
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            var controller = new CommunityPostsController(mockRepo, mockPush);

            var request = new CreatePostRequest { Title = title, Content = content };

            var result = controller.CreatePost(request);

            Assert.IsType<BadRequestObjectResult>(result);
        }
    }
}
