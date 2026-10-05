import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, afterEach } from 'vitest';
import Onboarding from './Onboarding';

// Mock Leaflet as it causes issues in JSDOM
vi.mock('react-leaflet', () => ({
  MapContainer: () => <div data-testid="map" />,
  TileLayer: () => <div />,
  Marker: () => <div />,
  useMapEvents: () => ({ flyTo: vi.fn() })
}));

describe('Onboarding', () => {
  afterEach(() => {
    cleanup();
  });
  it('advances to step 2 when clicking Continue', async () => {
    render(<Onboarding />);
    
    // Wait for form to become visible (500ms timeout in useEffect)
    await waitFor(() => {
      expect(screen.getByText('What should we call you?')).toBeTruthy();
    }, { timeout: 1000 });

    const input = screen.getByRole('textbox', { name: /name/i });
    const button = screen.getByRole('button', { name: /continue/i });

    // Type name
    await userEvent.type(input, 'John Doe');
    
    // The button should be enabled
    expect(button.disabled).toBe(false);

    // Click continue
    await userEvent.click(button);

    // Should move to step 2
    expect(screen.getByText('What is your phone number?')).toBeTruthy();
  });

  it('advances to step 2 when pressing Enter in step 1 input', async () => {
    render(<Onboarding />);
    
    await waitFor(() => {
      expect(screen.getByText('What should we call you?')).toBeTruthy();
    }, { timeout: 1000 });

    const input = screen.getByRole('textbox', { name: /name/i });
    
    // Type name and press Enter
    await userEvent.type(input, 'John Doe{enter}');
    
    // Should move to step 2
    await waitFor(() => {
      expect(screen.getByText('What is your phone number?')).toBeTruthy();
    });
  });
});
//use for future testings
