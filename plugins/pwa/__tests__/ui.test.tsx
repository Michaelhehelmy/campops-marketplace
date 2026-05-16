/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PWAInstallBanner, PWASettingsPage } from '../src/ui';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

describe('PWA UI Components', () => {
  beforeEach(() => {
    // Reset mocks
    vi.restoreAllMocks();
    window.localStorage.clear();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should render the PWAInstallBanner when in preview mode', () => {
    window.localStorage.setItem('pwa-preview', 'true');
    render(<PWAInstallBanner />);

    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
    expect(screen.getByText('Install CampOps App')).toBeInTheDocument();
    expect(screen.getByLabelText('Install App')).toBeInTheDocument();
  });

  it('should not render the PWAInstallBanner when not in preview and no prompt', () => {
    render(<PWAInstallBanner />);
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });

  it('should render the PWASettingsPage', () => {
    render(<PWASettingsPage />);

    expect(screen.getByTestId('pwa-settings-page')).toBeInTheDocument();
    expect(screen.getByText('PWA Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle Offline Mode')).toBeInTheDocument();
  });

  it('should toggle offline mode in settings', () => {
    render(<PWASettingsPage />);
    const toggle = screen.getByLabelText('Toggle Offline Mode');

    // Initial state (enabled in UI by default state)
    expect(toggle).toHaveClass('bg-brand-600');

    fireEvent.click(toggle);
    expect(toggle).toHaveClass('bg-gray-200');
  });

  it('should show banner on beforeinstallprompt event', async () => {
    render(<PWAInstallBanner />);
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();

    const mockEvent = new Event('beforeinstallprompt');
    (mockEvent as any).preventDefault = vi.fn();
    (mockEvent as any).prompt = vi.fn();
    (mockEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });

    fireEvent(window, mockEvent);

    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();

    const installButton = screen.getByLabelText('Install App');
    fireEvent.click(installButton);

    expect((mockEvent as any).prompt).toHaveBeenCalled();
    await (mockEvent as any).userChoice;

    await waitFor(() => {
      expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
    });
  });

  it('should not show banner if already in standalone mode', () => {
    (window.matchMedia as any).mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
    }));

    render(<PWAInstallBanner />);
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });
});
