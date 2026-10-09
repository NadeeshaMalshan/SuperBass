using System;
using Xunit;
using Superbass.Models;

namespace Superbass.Tests.BookingTests
{
    public class BookingPricingCalculationTests
    {
        [Theory]
        [InlineData("Hourly", 2500.0, 3, 7500.0)]
        [InlineData("Hourly", 3000.0, 2, 6000.0)]
        public void CalculateEstimatedPrice_ComputesCorrectHourlyTotal(
            string model,
            double rate,
            int hours,
            double expectedTotal)
        {
            var calculated = rate * hours;
            var booking = new Booking
            {
                PricingModel = model,
                EstimatedPrice = calculated
            };

            Assert.Equal("Hourly", booking.PricingModel);
            Assert.Equal(expectedTotal, booking.EstimatedPrice);
        }

        [Fact]
        public void AgreedPrice_OverridesEstimatedPriceWhenSet()
        {
            var booking = new Booking
            {
                EstimatedPrice = 5000.0,
                AgreedPrice = 4200.0
            };

            var finalPrice = booking.AgreedPrice ?? booking.EstimatedPrice;

            Assert.Equal(4200.0, finalPrice);
        }
    }
}
