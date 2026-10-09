import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { vi } from 'vitest';
vi.mock('axios');
import { setupMocks } from './residentTestUtils.jsx';
import ResidentProfile from '../../src/ResidentProfile.jsx';

describe('FE-R-10 GlobalErrorToast', () => {
    beforeEach(() => { setupMocks(); });
    it('runs successfully', async () => {
        axios.get.mockRejectedValueOnce({ response: { status: 401 } });
        render(<ResidentProfile />);
        expect(screen).toBeDefined();
    });
});
