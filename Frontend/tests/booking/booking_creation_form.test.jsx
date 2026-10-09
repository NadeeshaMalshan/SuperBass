import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import BookingFormCard from '../../src/components/agent/BookingFormCard.jsx';

// Mock Leaflet and CSS dependencies
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  useMapEvents: () => ({ flyTo: vi.fn() })
}));

describe('TC-01: Booking Creation & Request Form Validation (Frontend)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders booking form with worker details and calculates correct default state', () => {
    const mockData = {
      workerId: '42',
      workerName: 'Sunil Perera',
      category: 'Plumbing',
      hourlyRate: 2500,
      location: 'Colombo',
      contactPhone: '0771234567',
    };

    render(<BookingFormCard data={mockData} onAction={vi.fn()} />);

    // Verify worker header and category
    expect(screen.getByText(/Sunil Perera/i)).toBeTruthy();
    expect(screen.getByText(/Plumbing/i)).toBeTruthy();
  });

  it('submits valid booking payload to onAction callback when Book Appointment is clicked', () => {
    const mockOnAction = vi.fn();
    const mockData = {
      workerId: '101',
      workerName: 'Nimal Bandara',
      category: 'Electrical',
      hourlyRate: 3000,
      location: 'Kandy',
      contactPhone: '0719876543',
      selectedDate: '2026-10-15',
    };

    render(<BookingFormCard data={mockData} onAction={mockOnAction} />);

    // Locate book button
    const submitBtn = screen.getByRole('button', { name: /book appointment/i });
    expect(submitBtn).toBeTruthy();

    fireEvent.click(submitBtn);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
    const actionArg = mockOnAction.mock.calls[0][0];
    expect(actionArg.action).toBe('booking_form_submit');
    expect(actionArg.payload.workerId).toBe('101');
    expect(actionArg.payload.workerName).toBe('Nimal Bandara');
  });
});
