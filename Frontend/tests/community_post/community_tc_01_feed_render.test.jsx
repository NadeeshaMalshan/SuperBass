import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import Community from '../../src/Community.jsx';

// Mock Leaflet and external widgets
vi.mock('react-leaflet', () => ({
  MapContainer: () => <div data-testid="map" />,
  TileLayer: () => <div />,
  Marker: () => <div />,
  useMapEvents: () => ({ flyTo: vi.fn() })
}));

vi.mock('../../src/components/AiAssistantWidget.jsx', () => ({
  default: () => <div data-testid="ai-widget" />
}));
vi.mock('../../src/components/M3TopNavbar.jsx', () => ({
  default: () => <nav data-testid="top-navbar" />
}));
vi.mock('../../src/components/UserMenu.jsx', () => ({
  default: () => <div data-testid="user-menu" />
}));

vi.mock('axios');

describe('Frontend Community TC-01: Feed Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders community feed header and search inputs', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          postId: 1,
          title: 'Roof repair needed in Nugegoda',
          content: 'Leaking water during heavy rain',
          serviceCategoryName: 'Roofing',
          location: 'Colombo',
          likesCount: 3,
          commentsCount: 1,
          createdAt: new Date().toISOString()
        }
      ]
    });

    render(<Community />);

    // Check search input exists
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeTruthy();

    // Check mock post is rendered
    await waitFor(() => {
      expect(screen.getByText(/Roof repair needed in Nugegoda/i)).toBeTruthy();
    });
  });
});
