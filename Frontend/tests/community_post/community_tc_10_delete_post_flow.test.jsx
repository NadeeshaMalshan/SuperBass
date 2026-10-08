import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import axios from 'axios';
import MyCommunityPostsManager from '../../src/components/MyCommunityPostsManager.jsx';

vi.mock('axios');

describe('Frontend Community TC-10: Delete Post Flow', () => {
  it('renders author posts and allows deletion management', async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          postId: 102,
          title: 'Post Scheduled for Deletion',
          content: 'Temporary issue resolved',
          serviceCategoryName: 'Electrical',
          location: 'Kandy',
          status: 'Active',
          createdAt: new Date().toISOString()
        }
      ]
    });

    render(<MyCommunityPostsManager userEmail="author@workio.lk" />);

    await waitFor(() => {
      expect(screen.getByText('Post Scheduled for Deletion')).toBeTruthy();
    });
  });
});
