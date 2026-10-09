using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Superbass.Controllers;
using Superbass.Models;
using Xunit;

namespace Superbass.Tests.CommunityPostTests
{
    public class CommunityTc09ToggleLikeCounterTests
    {
        [Fact]
        public void ToggleLike_IncrementsAndDecrementsLikesCorrectly()
        {
            var mockRepo = new MockCommunityPostRepository();
            var mockPush = new FakePushNotificationService();
            mockRepo.Posts.Add(new CommunityPost { PostId = 8, Title = "Community Clean-up", UserId = "org@workio.lk" });

            var controller = new CommunityPostsController(mockRepo, mockPush);
            var req = new LikePostRequest { UserEmail = "user1@workio.lk", UserName = "User 1" };

            // First like -> should increase count
            var result1 = controller.ToggleLike(8, req);
            var okResult1 = Assert.IsType<OkObjectResult>(result1);
            var json1 = JsonSerializer.Serialize(okResult1.Value);
            using var doc1 = JsonDocument.Parse(json1);
            Assert.True(doc1.RootElement.GetProperty("isLiked").GetBoolean());
            Assert.Equal(1, doc1.RootElement.GetProperty("likesCount").GetInt32());

            // Second like from same user -> should unlike and decrease count
            var result2 = controller.ToggleLike(8, req);
            var okResult2 = Assert.IsType<OkObjectResult>(result2);
            var json2 = JsonSerializer.Serialize(okResult2.Value);
            using var doc2 = JsonDocument.Parse(json2);
            Assert.False(doc2.RootElement.GetProperty("isLiked").GetBoolean());
            Assert.Equal(0, doc2.RootElement.GetProperty("likesCount").GetInt32());
        }
    }
}
