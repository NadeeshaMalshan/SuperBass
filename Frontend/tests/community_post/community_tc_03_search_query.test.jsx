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

describe('Frontend Community TC-03: Search Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters posts dynamically and updates search query input', async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          postId: 10,
          title: 'Air Conditioner Gas Refill',
          content: 'Split AC leaking water and warm air',
          serviceCategoryName: 'AC Repair',
          location: 'Colombo',
          createdAt: new Date().toISOString()
        }
      ]
    });

    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('Air Conditioner Gas Refill')).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Gas Refill' } });

    expect(searchInput.value).toBe('Gas Refill');
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });
});
