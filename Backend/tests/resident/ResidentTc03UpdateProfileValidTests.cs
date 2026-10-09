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
    public class ResidentTc03UpdateProfileValidTests
    {
        [Fact]
        public async Task UpdateProfile_ReturnsOk()
        {
            var mockRepo = ResidentTestMocks.GetMockResidentRepository();
            var controller = new ResidentsController(mockRepo.Object);
            var result = await controller.UpdateProfile("test@test.com", new ResidentUpdateDto());
            result.Should().BeOfType<OkObjectResult>();
        }
    }
}
