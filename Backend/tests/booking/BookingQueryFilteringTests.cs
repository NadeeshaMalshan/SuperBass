using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Superbass.Models;

namespace Superbass.Tests.BookingTests
{
    public class BookingQueryFilteringTests
    {
        [Fact]
        public void FilterBookings_ReturnsOnlyTargetStatus()
        {
            var list = new List<Booking>
            {
                new Booking { Id = 1, ResidentEmail = "r1@test.com", Status = "Pending" },
                new Booking { Id = 2, ResidentEmail = "r1@test.com", Status = "Accepted" },
                new Booking { Id = 3, ResidentEmail = "r1@test.com", Status = "Completed" },
                new Booking { Id = 4, ResidentEmail = "r1@test.com", Status = "Cancelled" }
            };

            var upcoming = list.Where(b => b.Status == "Pending" || b.Status == "Accepted").ToList();
            var completed = list.Where(b => b.Status == "Completed").ToList();
            var cancelled = list.Where(b => b.Status == "Cancelled").ToList();

            Assert.Equal(2, upcoming.Count);
            Assert.Single(completed);
            Assert.Single(cancelled);
        }

        [Fact]
        public void SortBookings_OrdersByScheduledDateDescending()
        {
            var now = DateTime.UtcNow;
            var list = new List<Booking>
            {
                new Booking { Id = 1, ScheduledDate = now.AddDays(1) },
                new Booking { Id = 2, ScheduledDate = now.AddDays(3) },
                new Booking { Id = 3, ScheduledDate = now.AddDays(2) }
            };

            var sorted = list.OrderByDescending(b => b.ScheduledDate).ToList();

            Assert.Equal(2, sorted[0].Id);
            Assert.Equal(3, sorted[1].Id);
            Assert.Equal(1, sorted[2].Id);
        }
    }
}
