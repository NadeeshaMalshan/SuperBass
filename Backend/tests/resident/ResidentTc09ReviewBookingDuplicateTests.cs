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
    public class ResidentTc09ReviewBookingDuplicateTests
    {
        [Fact]
        public async Task ReviewBooking_Duplicate_ReturnsBadRequest()
        {
            var options = new DbContextOptionsBuilder<SuperbassDbContext>().UseInMemoryDatabase("DB_Duplicate").Options;
            using var context = new SuperbassDbContext(options);
            context.Workers.Add(new Worker { Id = 2, Name = "Worker" });
            context.Bookings.Add(new Booking { Id = 2, WorkerId = 2, Status = "Reviewed", ReviewRating = 5 });
            await context.SaveChangesAsync();
            var controller = new BookingsController(context, null, null, null);
            var result = await controller.ReviewBooking(2, new ReviewBookingRequest { QualityRating = 1, PunctualityRating = 1, CommunicationRating = 1 });
            // This exposes the duplicate review bug
            result.Should().BeOfType<BadRequestObjectResult>("Because a booking already reviewed should not be reviewed again.");
        }
    }
}
