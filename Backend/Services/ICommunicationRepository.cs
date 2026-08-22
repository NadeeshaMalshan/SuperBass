using System.Collections.Generic;
using System.Threading.Tasks;
using Superbass.Models;

namespace Superbass.Services
{
    public interface ICommunicationRepository
    {
        Task<ConversationSummaryDto> GetOrCreateConversationAsync(string residentEmail, int workerId, int? bookingId = null, string? initialMessage = null);
        Task<List<ConversationSummaryDto>> GetUserConversationsAsync(string userEmail);
        Task<ConversationDetailsDto?> GetConversationByIdAsync(int conversationId, string userEmail);
        Task<List<ChatMessageDto>> GetMessagesAsync(int conversationId, string userEmail, int page = 1, int pageSize = 50);
        Task<ChatMessageDto> SendMessageAsync(int conversationId, string senderEmail, string senderRole, SendMessageRequest request);
        Task<bool> MarkConversationAsReadAsync(int conversationId, string readerEmail);
        Task<bool> DeleteMessageAsync(int messageId, string userEmail);
        Task<int> GetTotalUnreadCountAsync(string userEmail);
    }
}
