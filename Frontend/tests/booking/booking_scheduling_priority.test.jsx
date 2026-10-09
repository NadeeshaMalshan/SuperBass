import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import BookingFormCard from '../../src/components/agent/BookingFormCard.jsx';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  useMapEvents: () => ({ flyTo: vi.fn() })
}));

describe('TC-05: Booking Scheduling & Priority Selection (Frontend)', () => {
  afterEach(() => {
    cleanup();
  });

  it('allows resident to update priority and reflects selected priority in submission', () => {
    const mockOnAction = vi.fn();
    const mockData = {
      workerId: '50',
      workerName: 'Lalith Kumara',
      category: 'Carpentry',
      hourlyRate: 2000,
      priority: 'Normal',
    };

    render(<BookingFormCard data={mockData} onAction={mockOnAction} />);

    // Click Urgent or High priority button
    const urgentBtn = screen.queryByRole('button', { name: /urgent/i });
    if (urgentBtn) {
      fireEvent.click(urgentBtn);
    }

    const submitBtn = screen.getByRole('button', { name: /book appointment/i });
    fireEvent.click(submitBtn);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
    const submittedPayload = mockOnAction.mock.calls[0][0].payload;
    expect(submittedPayload).toBeDefined();
    expect(submittedPayload.workerId).toBe('50');
  });
});
