import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import axios from 'axios';
import MyCommunityPostsManager from '../../src/components/MyCommunityPostsManager.jsx';

vi.mock('axios');

describe('Frontend Community TC-09: My Posts Manager', () => {
  it('renders author posts and displays post management actions', async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          postId: 101,
          title: 'My Published Repair Request',
          content: 'Details about the issue',
          serviceCategoryName: 'Plumbing',
          location: 'Colombo',
          status: 'Active',
          createdAt: new Date().toISOString()
        }
      ]
    });

    render(<MyCommunityPostsManager userEmail="user@workio.lk" />);

    await waitFor(() => {
      expect(screen.getByText('My Published Repair Request')).toBeTruthy();
    });
  });
});
