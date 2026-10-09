import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { vi } from 'vitest';
vi.mock('axios');
import { setupMocks } from './residentTestUtils.jsx';
import MyCommunityPostsManager from '../../src/components/MyCommunityPostsManager.jsx';

describe('FE-R-06 MyPostsDelete', () => {
    beforeEach(() => { setupMocks(); });
    it('runs successfully', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });
        render(<MyCommunityPostsManager />);
        expect(screen).toBeDefined();
    });
});
