using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Superbass.Models;

namespace Superbass.Services
{
    public class ChatHub : Hub
    {
        private readonly ICommunicationRepository _communicationRepo;
        public static readonly ConcurrentDictionary<string, DateTime> ActiveUsers = new(StringComparer.OrdinalIgnoreCase);

        public ChatHub(ICommunicationRepository communicationRepo)
        {
            _communicationRepo = communicationRepo;
        }

        public static bool IsUserOnline(string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            if (ActiveUsers.TryGetValue(email, out var lastActive))
            {
                return (DateTime.UtcNow - lastActive).TotalMinutes < 3;
            }
            return false;
        }

        public static DateTime? GetLastSeen(string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            if (ActiveUsers.TryGetValue(email, out var lastActive))
            {
                return lastActive;
            }
            return null;
        }

        public static void RecordActivity(string? email)
        {
            if (!string.IsNullOrWhiteSpace(email))
            {
                ActiveUsers[email] = DateTime.UtcNow;
            }
        }

        public override async Task OnConnectedAsync()
        {
            var email = Context.GetHttpContext()?.Request.Query["userEmail"].ToString();
            if (!string.IsNullOrWhiteSpace(email))
            {
                RecordActivity(email);
                await Clients.All.SendAsync("UserPresenceChanged", new { userEmail = email, isOnline = true });
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var email = Context.GetHttpContext()?.Request.Query["userEmail"].ToString();
            if (!string.IsNullOrWhiteSpace(email))
            {
                RecordActivity(email);
                await Clients.All.SendAsync("UserPresenceChanged", new { userEmail = email, isOnline = false, lastSeen = DateTime.UtcNow });
            }
            await base.OnDisconnectedAsync(exception);
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
            RecordActivity(senderEmail);

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
            RecordActivity(userEmail);

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
            RecordActivity(readerEmail);

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
