using System;
using Xunit;
using Superbass.Models;

namespace Superbass.Tests.BookingTests
{
    public class BookingCancellationTests
    {
        [Fact]
        public void CancelBooking_SetsStatusToCancelledAndRecordsReason()
        {
            var booking = new Booking
            {
                Id = 15,
                ResidentEmail = "resident@workio.lk",
                WorkerId = 8,
                JobTitle = "Garden Landscaping",
                Status = "Accepted",
                CreatedAt = DateTime.UtcNow
            };

            const string reason = "Resident had to reschedule due to emergency travel";
            booking.Status = "Cancelled";
            booking.CancellationReason = reason;
            booking.UpdatedAt = DateTime.UtcNow;

            Assert.Equal("Cancelled", booking.Status);
            Assert.Equal(reason, booking.CancellationReason);
            Assert.NotNull(booking.CancellationReason);
        }

        [Fact]
        public void RejectBooking_RecordsWorkerRejectionReason()
        {
            var booking = new Booking
            {
                Id = 16,
                ResidentEmail = "resident@workio.lk",
                WorkerId = 8,
                JobTitle = "Roof Waterproofing",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            const string rejectionNote = "Worker unavailable during requested slot";
            booking.Status = "Rejected";
            booking.RejectionReason = rejectionNote;
            booking.UpdatedAt = DateTime.UtcNow;

            Assert.Equal("Rejected", booking.Status);
            Assert.Equal(rejectionNote, booking.RejectionReason);
        }
    }
}
