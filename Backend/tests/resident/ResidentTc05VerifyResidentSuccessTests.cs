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
    public class ResidentTc05VerifyResidentSuccessTests
    {
        [Fact]
        public async Task VerifyResident_Success_ReturnsOk()
        {
            var mockRepo = ResidentTestMocks.GetMockResidentRepository();
            mockRepo.Setup(r => r.VerifyResidentAsync("test@test.com", "123")).ReturnsAsync(true);
            var controller = new ResidentsController(mockRepo.Object);
            var result = await controller.VerifyResident("test@test.com", new VerifyResidentDto { NicNumber = "123" });
            result.Should().BeOfType<OkObjectResult>();
        }
    }
}
