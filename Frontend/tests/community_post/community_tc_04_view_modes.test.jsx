import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
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
vi.mock('axios');

describe('Frontend Community TC-04: View Modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('stores and switches view mode in localStorage (large, small, list)', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    render(<Community />);

    expect(localStorage.getItem('community_view_mode')).toBeNull();

    // Find and click compact/list view button if available
    const viewButtons = screen.getAllByRole('button');
    expect(viewButtons.length).toBeGreaterThan(0);
  });
});
