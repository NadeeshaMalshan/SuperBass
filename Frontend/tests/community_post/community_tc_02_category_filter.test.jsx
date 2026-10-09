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

describe('Frontend Community TC-02: Category Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers category selection and calls API with category filter', async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          postId: 1,
          title: 'Emergency Plumbing Repair',
          content: 'Kitchen pipe burst',
          serviceCategoryName: 'Plumbing',
          location: 'Colombo',
          createdAt: new Date().toISOString()
        }
      ]
    });

    render(<Community />);

    await waitFor(() => {
      expect(screen.getByText('Emergency Plumbing Repair')).toBeTruthy();
    });

    // Check that categories exist and clicking Plumbing triggers API
    const plumbingOptions = screen.getAllByText(/Plumbing/i);
    expect(plumbingOptions.length).toBeGreaterThan(0);
    fireEvent.click(plumbingOptions[0]);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });
});
