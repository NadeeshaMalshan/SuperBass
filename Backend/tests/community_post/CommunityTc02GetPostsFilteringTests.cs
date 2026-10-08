using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc02GetPostsFilteringTests
    {
        [Fact]
        public void GetPosts_FiltersByCategoryAndLocation()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 1, Title = "Plumbing Leak", ServiceCategoryId = "Plumbing", Location = "Colombo" });
            mockRepo.Posts.Add(new CommunityPost { PostId = 2, Title = "House Painting", ServiceCategoryId = "Painting", Location = "Kandy" });

            var controller = new CommunityPostsController(mockRepo, mockPush);

            var result = controller.GetPosts(search: null, category: "Plumbing", location: "Colombo", sort: null);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var posts = Assert.IsAssignableFrom<IEnumerable<CommunityPost>>(okResult.Value);
            var list = posts.ToList();
            Assert.Single(list);
            Assert.Equal("Plumbing Leak", list[0].Title);
        }
    }
}
