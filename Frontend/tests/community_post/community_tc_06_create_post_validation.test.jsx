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

describe('Frontend Community TC-06: Create Post Validation', () => {
  it('renders Post Free Ad / Request button for community members', async () => {
    render(<Community />);

    await waitFor(() => {
      const postBtn = screen.getByText(/Post Free Ad/i);
      expect(postBtn).toBeTruthy();
    });
  });
});
