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
    public class ResidentTc06VerifyResidentFailTests
    {
        [Fact]
        public async Task VerifyResident_Fail_ReturnsBadRequest()
        {
            var mockRepo = ResidentTestMocks.GetMockResidentRepository();
            mockRepo.Setup(r => r.VerifyResidentAsync("test@test.com", "123")).ReturnsAsync(false);
            var controller = new ResidentsController(mockRepo.Object);
            var result = await controller.VerifyResident("test@test.com", new VerifyResidentDto { NicNumber = "123" });
            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
