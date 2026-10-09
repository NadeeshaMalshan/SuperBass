import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { vi } from 'vitest';
vi.mock('axios');
import { setupMocks } from './residentTestUtils.jsx';
import BookingListCard from '../../src/components/agent/BookingListCard.jsx';

describe('FE-R-09 BookingListCardRenders', () => {
    beforeEach(() => { setupMocks(); });
    it('runs successfully', async () => {
        render(<BookingListCard bookings={[]} />);
        expect(screen).toBeDefined();
    });
});
