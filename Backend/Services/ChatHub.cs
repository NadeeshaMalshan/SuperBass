using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Superbass.Models;

namespace Superbass.Services
{
    public class ChatHub : Hub
    {
        private readonly ICommunicationRepository _communicationRepo;

        public ChatHub(ICommunicationRepository communicationRepo)
        {
            _communicationRepo = communicationRepo;
        }

        public async Task JoinConversation(int conversationId)
        {
            var groupName = $"conversation_{conversationId}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public async Task LeaveConversation(int conversationId)
        {
            var groupName = $"conversation_{conversationId}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        public async Task<ChatMessageDto> SendDirectMessage(
            int conversationId, 
            string senderEmail, 
            string senderRole, 
            SendMessageRequest request)
        {
            var message = await _communicationRepo.SendMessageAsync(
                conversationId, 
                senderEmail, 
                senderRole, 
                request);

            var groupName = $"conversation_{conversationId}";
            await Clients.Group(groupName).SendAsync("ReceiveMessage", message);

            return message;
        }

        public async Task SendTyping(int conversationId, string userEmail, bool isTyping)
        {
            var groupName = $"conversation_{conversationId}";
            await Clients.OthersInGroup(groupName).SendAsync("UserTyping", new 
            { 
                conversationId, 
                userEmail, 
                isTyping 
            });
        }

        public async Task MarkMessagesAsRead(int conversationId, string readerEmail)
        {
            var updated = await _communicationRepo.MarkConversationAsReadAsync(conversationId, readerEmail);
            if (updated)
            {
                var groupName = $"conversation_{conversationId}";
                await Clients.OthersInGroup(groupName).SendAsync("MessagesRead", new 
                { 
                    conversationId, 
                    readerEmail 
                });
            }
        }
    }
}
