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
    public class ResidentTc04UpdateProfileUnauthorizedTests
    {
        [Fact]
        public async Task UpdateProfile_FailsAuthorization()
        {
            var mockRepo = ResidentTestMocks.GetMockResidentRepository();
            var controller = new ResidentsController(mockRepo.Object);
            var result = await controller.UpdateProfile("other@test.com", new ResidentUpdateDto());
            // This exposes the missing authorization check. It will return OK, but we assert ForbidResult.
            result.Should().BeOfType<ForbidResult>("Because a resident cannot modify another resident's profile.");
        }
    }
}
