using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Xunit;
using FluentAssertions;
using Superbass.Controllers;
using Superbass.Models;
using Moq;
using Microsoft.EntityFrameworkCore;

namespace Superbass.Tests.ResidentTests
{
    public class ResidentTc10DeleteProfileTests
    {
        [Fact]
        public async Task DeleteProfile_ReturnsOk()
        {
            var mockRepo = ResidentTestMocks.GetMockResidentRepository();
            mockRepo.Setup(r => r.DeleteResidentAsync("test@test.com")).ReturnsAsync(true);
            var controller = new ResidentsController(mockRepo.Object);
            var result = await controller.DeleteProfile("test@test.com");
            result.Should().BeOfType<OkObjectResult>();
        }
    }
}
