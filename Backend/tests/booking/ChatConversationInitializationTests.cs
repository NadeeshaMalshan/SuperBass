using System;
using Xunit;
using Superbass.Models;

namespace Superbass.Tests.BookingTests
{
    public class ChatConversationInitializationTests
    {
        [Fact]
        public void CreateConversation_InitializesParticipantsCorrectly()
        {
            var conversation = new Conversation
            {
                Id = 12,
                ResidentEmail = "resident@workio.lk",
                WorkerEmail = "worker@workio.lk",
                WorkerId = 5,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            Assert.Equal("resident@workio.lk", conversation.ResidentEmail);
            Assert.Equal("worker@workio.lk", conversation.WorkerEmail);
            Assert.Equal(5, conversation.WorkerId);
            Assert.True(conversation.CreatedAt <= DateTime.UtcNow);
        }

        [Fact]
        public void ConversationDto_ExposesUnreadCountAndOtherUser()
        {
            var dto = new ConversationDto
            {
                Id = 12,
                OtherUserEmail = "worker@workio.lk",
                OtherUserName = "Sunil Electrician",
                LastMessage = "I am on the way.",
                LastMessageAt = DateTime.UtcNow,
                UnreadCount = 3,
                IsWorker = false
            };

            Assert.Equal(3, dto.UnreadCount);
            Assert.Equal("worker@workio.lk", dto.OtherUserEmail);
            Assert.Equal("Sunil Electrician", dto.OtherUserName);
            Assert.False(dto.IsWorker);
        }
    }
}
