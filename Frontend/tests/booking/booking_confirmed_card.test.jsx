import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import BookingConfirmedCard from '../../src/components/agent/BookingConfirmedCard.jsx';

describe('TC-02: Booking Confirmed Status Card Display (Frontend)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders confirmed appointment card with booking id and worker details', () => {
    const mockData = {
      bookingId: 789,
      workerId: '12',
      workerName: 'Kamal Silva',
      jobTitle: 'Fix Kitchen Pipe Leak',
      scheduledDate: '2026-10-20T10:00:00Z',
      locationAddress: 'No 15, Galle Road, Colombo',
      contactPhone: '0778899001',
      status: 'Confirmed',
    };

    render(<BookingConfirmedCard data={mockData} />);

    expect(screen.getByText(/Booking #789 Details/i)).toBeTruthy();
    expect(screen.getByText(/Kamal Silva/i)).toBeTruthy();
    expect(screen.getByText(/Fix Kitchen Pipe Leak/i)).toBeTruthy();
    expect(screen.getByText(/No 15, Galle Road, Colombo/i)).toBeTruthy();
  });

  it('displays custom card title and subtitle when provided in card data', () => {
    const mockData = {
      bookingId: 999,
      workerName: 'Ruwan Wijesinghe',
      cardTitle: 'Emergency Slot Reserved!',
      cardSubtitle: 'Technician will arrive within 2 hours.',
      status: 'InProgress',
    };

    render(<BookingConfirmedCard data={mockData} />);

    expect(screen.getByText('Emergency Slot Reserved!')).toBeTruthy();
    expect(screen.getByText('Technician will arrive within 2 hours.')).toBeTruthy();
  });
});
