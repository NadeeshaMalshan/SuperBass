import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import ChatModal from '../../src/components/ChatModal.jsx';

// Mock chatSignalR
vi.mock('../../src/services/chatSignalR.js', () => ({
  chatSignalR: {
    connect: vi.fn().mockResolvedValue(true),
    joinConversation: vi.fn().mockResolvedValue(true),
    leaveConversation: vi.fn().mockResolvedValue(true),
    sendMessage: vi.fn().mockResolvedValue(true),
    sendTyping: vi.fn(),
    markMessagesRead: vi.fn().mockResolvedValue(true),
    on: vi.fn(),
    off: vi.fn(),
  }
}));

describe('TC-07: Chat Conversation Initialization & Modal Header (Frontend)', () => {
  beforeEach(() => {
    localStorage.setItem('email', 'resident@test.com');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders chat modal with recipient details when isOpen is true', () => {
    const mockRecipient = {
      name: 'Sunil Plumber',
      email: 'sunil@workio.lk',
      avatar: null,
      workerId: 10,
    };

    render(
      <ChatModal
        isOpen={true}
        onClose={vi.fn()}
        recipient={mockRecipient}
      />
    );

    expect(screen.getByText('Sunil Plumber')).toBeTruthy();
    expect(screen.getByPlaceholderText(/type a message/i)).toBeTruthy();
  });

  it('does not render dialog content when isOpen is false', () => {
    const { container } = render(
      <ChatModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
