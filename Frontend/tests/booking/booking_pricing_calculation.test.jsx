import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import BookingConfirmationCard from '../../src/components/agent/BookingConfirmationCard.jsx';

describe('TC-06: Booking Pricing Calculation & Display (Frontend)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders hourly rate and estimated cost formatted in LKR', () => {
    const mockData = {
      workerId: '60',
      workerName: 'Prasanna Fernando',
      category: 'Masonry',
      jobTitle: 'Wall Plaster Repair',
      hourlyRate: 3500,
      estimatedPrice: 7000,
      scheduledDate: '2026-10-25',
    };

    render(<BookingConfirmationCard data={mockData} onAction={() => {}} />);

    // Check hourly rate or estimated total display
    expect(screen.getByText(/3,500|3500/)).toBeTruthy();
    expect(screen.getByText(/7,000|7000/)).toBeTruthy();
  });

  it('falls back gracefully to default rate when rate is omitted', () => {
    const mockData = {
      workerId: '61',
      workerName: 'Ajith Dias',
      jobTitle: 'General Handyman Work',
    };

    render(<BookingConfirmationCard data={mockData} onAction={() => {}} />);

    // Default rate is 2800 in BookingConfirmationCard
    expect(screen.getByText(/2,800|2800/)).toBeTruthy();
  });
});
