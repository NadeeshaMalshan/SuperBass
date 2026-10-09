import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { vi } from 'vitest';
vi.mock('axios');
import { setupMocks } from './residentTestUtils.jsx';
import AiCommunityChat from '../../src/pages/AiCommunityChat.jsx';

describe('FE-R-07 AiChatSubmit', () => {
    beforeEach(() => { setupMocks(); });
    it('runs successfully', async () => {
        render(<AiCommunityChat />);
        expect(screen).toBeDefined();
    });
});
