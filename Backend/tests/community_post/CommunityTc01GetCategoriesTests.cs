using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc01GetCategoriesTests
    {
        [Fact]
        public void GetCategories_ReturnsOkResult_WithStandardCategories()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            var controller = new CommunityPostsController(mockRepo, mockPush);

            var result = controller.GetCategories();

            var okResult = Assert.IsType<OkObjectResult>(result);
            var categories = Assert.IsAssignableFrom<IEnumerable<ServiceCategory>>(okResult.Value);
            Assert.NotEmpty(categories);
        }
    }
}
