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
    public class ResidentTc02GetProfileNotFoundTests
    {
        [Fact]
        public async Task GetProfile_NotFound_ReturnsDefault()
        {
            var mockRepo = ResidentTestMocks.GetMockResidentRepository();
            var controller = new ResidentsController(mockRepo.Object);
            var result = await controller.GetProfile("newuser@test.com");
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var res = okResult.Value.Should().BeOfType<Resident>().Subject;
            res.Name.Should().Be("newuser");
        }
    }
}
