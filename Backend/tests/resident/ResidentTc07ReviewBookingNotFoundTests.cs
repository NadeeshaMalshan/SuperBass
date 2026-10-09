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
    public class ResidentTc07ReviewBookingNotFoundTests
    {
        [Fact]
        public async Task ReviewBooking_NotFound_ReturnsNotFound()
        {
            var options = new DbContextOptionsBuilder<SuperbassDbContext>().UseInMemoryDatabase("DB_NotFound").Options;
            using var context = new SuperbassDbContext(options);
            var controller = new BookingsController(context, null, null, null);
            var result = await controller.ReviewBooking(99, new ReviewBookingRequest());
            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}
