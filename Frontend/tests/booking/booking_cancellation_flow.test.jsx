import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import BookingConfirmationCard from '../../src/components/agent/BookingConfirmationCard.jsx';

describe('TC-03: Booking Rejection and Cancellation Flow (Frontend)', () => {
  afterEach(() => {
    cleanup();
  });

  it('triggers onAction cancellation callback when user clicks Cancel button', () => {
    const mockOnAction = vi.fn();
    const mockData = {
      bookingId: '105',
      workerId: '45',
      workerName: 'Saman Jayasinghe',
      jobTitle: 'Roof Repair',
      cancelPrompt: 'CANCEL_BOOKING: Changed my mind, please cancel.',
    };

    render(<BookingConfirmationCard data={mockData} onAction={mockOnAction} />);

    // Find the cancel/reject button
    const cancelBtn = screen.getByRole('button', { name: /cancel|no/i });
    expect(cancelBtn).toBeTruthy();

    fireEvent.click(cancelBtn);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
    const actionArg = mockOnAction.mock.calls[0][0];
    expect(actionArg.action).toBe('booking_confirm_response');
    expect(actionArg.payload.confirmed).toBe(false);
  });
});
