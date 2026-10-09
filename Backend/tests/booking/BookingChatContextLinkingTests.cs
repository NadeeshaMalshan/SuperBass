using System;
using Xunit;
using Superbass.Models;

namespace Superbass.Tests.BookingTests
{
    public class BookingChatContextLinkingTests
    {
        [Fact]
        public void Booking_LinksToConversationIdCorrectly()
        {
            var booking = new Booking
            {
                Id = 88,
                ResidentEmail = "resident@workio.lk",
                WorkerId = 14,
                JobTitle = "Plumbing Leak Fix",
                ConversationId = 42,
                Status = "Accepted"
            };

            Assert.NotNull(booking.ConversationId);
            Assert.Equal(42, booking.ConversationId);
        }

        [Fact]
        public void BookingResponseDto_ExposesConversationIdForNavigation()
        {
            var dto = new BookingResponseDto
            {
                Id = 88,
                ResidentEmail = "resident@workio.lk",
                WorkerId = 14,
                WorkerName = "Upul Silva",
                JobTitle = "Plumbing Leak Fix",
                ConversationId = 42,
                Status = "Accepted"
            };

            Assert.Equal(42, dto.ConversationId);
            Assert.Equal("Upul Silva", dto.WorkerName);
        }
    }
}
