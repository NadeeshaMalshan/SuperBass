import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import Community from '../../src/Community.jsx';

vi.mock('react-leaflet', () => ({
  MapContainer: () => <div />,
  TileLayer: () => <div />,
  Marker: () => <div />,
  useMapEvents: () => ({ flyTo: vi.fn() })
}));
vi.mock('../../src/components/AiAssistantWidget.jsx', () => ({ default: () => <div /> }));
vi.mock('../../src/components/M3TopNavbar.jsx', () => ({ default: () => <nav /> }));
vi.mock('../../src/components/UserMenu.jsx', () => ({ default: () => <div /> }));

vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: [
        {
          postId: 10,
          title: 'Garden Care Help',
          content: 'Need grass trimming',
          serviceCategoryName: 'Gardening',
          location: 'Colombo',
          likesCount: 5,
          createdAt: new Date().toISOString()
        }
      ]
    }),
    post: vi.fn()
  }
}));

describe('Frontend Community TC-07: Like Interaction', () => {
  it('renders like count correctly on post cards', async () => {
    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('Garden Care Help')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });
  });
});
