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
    public class ResidentTc01GetProfileExistsTests
    {
        [Fact]
        public async Task GetProfile_Exists_ReturnsOk()
        {
            var mockRepo = ResidentTestMocks.GetMockResidentRepository();
            mockRepo.Setup(r => r.GetResidentAsync("test@test.com")).ReturnsAsync(new Resident { Email = "test@test.com", Name = "Test" });
            var controller = new ResidentsController(mockRepo.Object);
            var result = await controller.GetProfile("test@test.com");
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var res = okResult.Value.Should().BeOfType<Resident>().Subject;
            res.Name.Should().Be("Test");
        }
    }
}
