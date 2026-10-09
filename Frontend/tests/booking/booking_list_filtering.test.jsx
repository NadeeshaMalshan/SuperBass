import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import BookingListCard from '../../src/components/agent/BookingListCard.jsx';

describe('TC-04: Resident Booking List & Status Filtering (Frontend)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders booking list with status badges and job summaries', () => {
    const mockData = {
      totalCount: 2,
      statusFilter: 'Upcoming',
      bookings: [
        {
          id: 101,
          workerName: 'Nimal Perera',
          jobTitle: 'Ceiling Fan Installation',
          scheduledDate: '2026-10-18T10:00:00Z',
          status: 'Confirmed',
          estimatedPrice: 3500,
        },
        {
          id: 102,
          workerName: 'Kusum Silva',
          jobTitle: 'Plumbing Trap Replacement',
          scheduledDate: '2026-10-22T14:00:00Z',
          status: 'Requested',
          estimatedPrice: 2800,
        },
      ],
    };

    render(<BookingListCard data={mockData} onAction={() => {}} />);

    expect(screen.getByText(/Ceiling Fan Installation/i)).toBeTruthy();
    expect(screen.getByText(/Plumbing Trap Replacement/i)).toBeTruthy();
    expect(screen.getByText(/Confirmed/i)).toBeTruthy();
    expect(screen.getByText(/Requested/i)).toBeTruthy();
  });

  it('renders empty state when no bookings match filter', () => {
    const mockData = {
      totalCount: 0,
      statusFilter: 'Upcoming',
      bookings: [],
    };

    render(<BookingListCard data={mockData} onAction={() => {}} />);
    expect(screen.getByText(/No Bookings Found|No.*bookings/i)).toBeTruthy();
  });
});
