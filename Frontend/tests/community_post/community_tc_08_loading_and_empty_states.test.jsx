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
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn()
  }
}));

describe('Frontend Community TC-08: Loading and Empty States', () => {
  it('renders gracefully when no community posts exist', async () => {
    render(<Community />);

    await waitFor(() => {
      // Empty feed should not crash and search bar remains accessible
      expect(screen.getByPlaceholderText(/search/i)).toBeTruthy();
    });
  });
});
