import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatSignalR } from '../../src/services/chatSignalR.js';

describe('TC-08: Real-Time Chat SignalR Message Handling (Frontend)', () => {
  beforeEach(() => {
    chatSignalR.listeners.clear();
  });

  it('registers and invokes event listeners via on() and _emit()', () => {
    const mockCallback = vi.fn();
    chatSignalR.on('ReceiveMessage', mockCallback);

    expect(chatSignalR.listeners.has('ReceiveMessage')).toBe(true);

    const testMessage = {
      id: 55,
      conversationId: 10,
      senderEmail: 'worker@workio.lk',
      text: 'Hello, I will arrive at 10 AM.',
      sentAt: new Date().toISOString(),
    };

    chatSignalR._emit('ReceiveMessage', testMessage);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(testMessage);
  });

  it('unregisters event listener cleanly via off()', () => {
    const mockCallback = vi.fn();
    chatSignalR.on('ReceiveMessage', mockCallback);
    chatSignalR.off('ReceiveMessage', mockCallback);

    chatSignalR._emit('ReceiveMessage', { text: 'test' });
    expect(mockCallback).not.toHaveBeenCalled();
  });
});
