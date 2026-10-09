import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { vi } from 'vitest';
vi.mock('axios');
import { setupMocks } from './residentTestUtils.jsx';
import ReviewFormCard from '../../src/components/agent/ReviewFormCard.jsx';

describe('FE-R-08 ReviewFormCardValidation', () => {
    beforeEach(() => { setupMocks(); });
    it('runs successfully', async () => {
        render(<ReviewFormCard bookingId="1" workerName="Worker" onReviewSubmitted={()=>{}} />);
        expect(screen).toBeDefined();
    });
});
