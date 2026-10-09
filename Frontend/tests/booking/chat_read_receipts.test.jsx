import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatSignalR } from '../../src/services/chatSignalR.js';

describe('TC-09: Chat Read Receipts and Typing State (Frontend)', () => {
  beforeEach(() => {
    chatSignalR.listeners.clear();
  });

  it('handles MessagesRead event emission for read receipts', () => {
    const readCallback = vi.fn();
    chatSignalR.on('MessagesRead', readCallback);

    const readReceiptPayload = {
      conversationId: 25,
      readByEmail: 'resident@test.com',
      readAt: new Date().toISOString(),
    };

    chatSignalR._emit('MessagesRead', readReceiptPayload);

    expect(readCallback).toHaveBeenCalledTimes(1);
    expect(readCallback).toHaveBeenCalledWith(readReceiptPayload);
  });

  it('handles UserTyping event emission for live presence', () => {
    const typingCallback = vi.fn();
    chatSignalR.on('UserTyping', typingCallback);

    const typingPayload = {
      conversationId: 25,
      userEmail: 'worker@test.com',
      isTyping: true,
    };

    chatSignalR._emit('UserTyping', typingPayload);

    expect(typingCallback).toHaveBeenCalledTimes(1);
    expect(typingCallback).toHaveBeenCalledWith(typingPayload);
  });
});
