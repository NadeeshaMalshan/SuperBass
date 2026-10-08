import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import CommunityPostDetail from '../../src/CommunityPostDetail.jsx';

vi.mock('../../src/components/AiAssistantWidget.jsx', () => ({ default: () => <div /> }));
vi.mock('../../src/components/ChatModal.jsx', () => ({ default: () => <div /> }));
vi.mock('axios');

describe('Frontend Community TC-05: Detail Modal & View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '?id=77');
  });

  it('renders detailed post information including title, content, and author', async () => {
    const mockPost = {
      postId: 77,
      title: 'Roof repair needed urgently',
      content: 'Heavy leaking during monsoon rain in bedroom ceiling',
      serviceCategoryName: 'Roofing',
      location: 'Colombo',
      userName: 'Kasun Silva',
      likesCount: 4,
      createdAt: new Date().toISOString()
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/comments')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: mockPost });
    });

    render(<CommunityPostDetail />);

    await waitFor(() => {
      const titles = screen.getAllByText('Roof repair needed urgently');
      expect(titles.length).toBeGreaterThan(0);
      expect(screen.getByText(/Heavy leaking during monsoon rain/i)).toBeTruthy();
    });
  });
});
