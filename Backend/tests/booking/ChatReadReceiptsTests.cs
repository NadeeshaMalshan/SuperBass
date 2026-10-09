using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Superbass.Models;

namespace Superbass.Tests.BookingTests
{
    public class ChatReadReceiptsTests
    {
        [Fact]
        public void MarkMessageAsRead_UpdatesIsReadAndReadAtTimestamp()
        {
            var msg = new ChatMessage
            {
                Id = 101,
                ConversationId = 20,
                SenderEmail = "worker@workio.lk",
                ReceiverEmail = "resident@workio.lk",
                Content = "Arriving in 15 mins",
                CreatedAt = DateTime.UtcNow.AddMinutes(-10),
                IsRead = false
            };

            var readTime = DateTime.UtcNow;
            msg.IsRead = true;
            msg.ReadAt = readTime;

            Assert.True(msg.IsRead);
            Assert.Equal(readTime, msg.ReadAt);
        }

        [Fact]
        public void ComputeUnreadMessagesCount_CalculatesCorrectlyForRecipient()
        {
            var messages = new List<ChatMessage>
            {
                new ChatMessage { Id = 1, ReceiverEmail = "resident@workio.lk", IsRead = false },
                new ChatMessage { Id = 2, ReceiverEmail = "resident@workio.lk", IsRead = false },
                new ChatMessage { Id = 3, ReceiverEmail = "resident@workio.lk", IsRead = true },
                new ChatMessage { Id = 4, ReceiverEmail = "other@workio.lk", IsRead = false },
            };

            var unreadForResident = messages.Count(m => m.ReceiverEmail == "resident@workio.lk" && !m.IsRead);

            Assert.Equal(2, unreadForResident);
        }
    }
}
