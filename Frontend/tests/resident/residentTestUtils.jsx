import React from 'react';
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');
vi.mock('../../src/utils/toast.js', () => ({ showToast: vi.fn() }));

export const setupMocks = () => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
};
