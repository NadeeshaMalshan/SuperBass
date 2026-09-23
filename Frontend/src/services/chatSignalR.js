import * as signalR from '@microsoft/signalr';
import { BACKEND_URL } from '../config.js';

class ChatSignalRService {
  constructor() {
    this.connection = null;
    this.currentEmail = null;
    this.listeners = new Map();
    this.currentRoom = null;
    this.isConnecting = false;
  }

  /**
   * Connect to the SignalR ChatHub
   * @param {string} userEmail
   */
  async connect(userEmail) {
    if (!userEmail) return;
    
    // If already connected with same email, keep connection
    if (
      this.connection &&
      this.currentEmail?.toLowerCase() === userEmail.toLowerCase() &&
      this.connection.state === signalR.HubConnectionState.Connected
    ) {
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (e) {
        // ignore disconnect error
      }
    }

    this.currentEmail = userEmail;
    const cleanBaseUrl = (BACKEND_URL || '').replace(/\/+$/, '');
    const hubUrl = `${cleanBaseUrl}/chathub?userEmail=${encodeURIComponent(userEmail)}`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Register Hub event handlers
    this.connection.on('ReceiveMessage', (data) => {
      this._emit('ReceiveMessage', data);
    });

    this.connection.on('MessagesRead', (data) => {
      this._emit('MessagesRead', data);
    });

    this.connection.on('UserPresenceChanged', (data) => {
      this._emit('UserPresenceChanged', data);
    });

    this.connection.on('UserTyping', (data) => {
      this._emit('UserTyping', data);
    });

    this.connection.onreconnected(async () => {
      console.log('[SignalR] Reconnected. Re-joining room if active:', this.currentRoom);
      if (this.currentRoom) {
        try {
          await this.connection.invoke('JoinConversation', this.currentRoom);
        } catch (e) {
          console.warn('[SignalR] Failed to re-join room on reconnect:', e.message);
        }
      }
      this._emit('Reconnected');
    });

    this.connection.onclose(() => {
      this._emit('Disconnected');
    });

    try {
      await this.connection.start();
      console.log('[SignalR] Connected to ChatHub as', userEmail);
      if (this.currentRoom) {
        await this.connection.invoke('JoinConversation', this.currentRoom);
      }
    } catch (err) {
      console.warn('[SignalR] Hub connection error:', err.message);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Join a conversation room
   * @param {number|string} conversationId
   */
  async joinConversation(conversationId) {
    if (!conversationId) return;
    const id = parseInt(conversationId, 10);
    if (isNaN(id)) return;

    if (this.currentRoom && this.currentRoom !== id) {
      await this.leaveConversation(this.currentRoom);
    }

    this.currentRoom = id;
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinConversation', id);
      } catch (e) {
        console.warn('[SignalR] Error joining conversation:', e.message);
      }
    }
  }

  /**
   * Leave a conversation room
   * @param {number|string} conversationId
   */
  async leaveConversation(conversationId) {
    if (!conversationId) return;
    const id = parseInt(conversationId, 10);
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveConversation', id);
      } catch (e) {
        // ignore
      }
    }
    if (this.currentRoom === id) {
      this.currentRoom = null;
    }
  }

  /**
   * Send typing status
   * @param {number|string} conversationId
   * @param {boolean} isTyping
   */
  async sendTyping(conversationId, isTyping) {
    if (!conversationId || !this.currentEmail) return;
    const id = parseInt(conversationId, 10);
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('SendTyping', id, this.currentEmail, isTyping);
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Mark messages in conversation as read via Hub
   * @param {number|string} conversationId
   */
  async markMessagesAsRead(conversationId) {
    if (!conversationId || !this.currentEmail) return;
    const id = parseInt(conversationId, 10);
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('MarkMessagesAsRead', id, this.currentEmail);
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Subscribe to event
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from event
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  _emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[SignalR] Callback error for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Disconnect and clear state
   */
  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (e) {
        // ignore
      }
      this.connection = null;
      this.currentEmail = null;
      this.currentRoom = null;
    }
  }
}

export const chatSignalR = new ChatSignalRService();
export default chatSignalR;
