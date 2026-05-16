// @vitest-environment jsdom
import React from 'react';
import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroSection from '../HeroSection';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('HeroSection component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render hero section with title and description', () => {
    render(<HeroSection />);
    expect(screen.getByText('Adventure Awaits')).toBeInTheDocument();
    expect(
      screen.getByText('Discover unique camps, lodges, and retreats around the world')
    ).toBeInTheDocument();
  });

  it('should render search form with all inputs', () => {
    render(<HeroSection />);
    expect(screen.getByLabelText('Destination')).toBeInTheDocument();
    expect(screen.getByLabelText('Check-in date')).toBeInTheDocument();
    expect(screen.getByLabelText('Check-out date')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of guests')).toBeInTheDocument();
  });

  it('should have default guests value of 2', () => {
    render(<HeroSection />);
    const guestsSelect = screen.getByLabelText('Number of guests');

    expect(guestsSelect).toHaveValue('2');
  });

  it('should have all guest options', () => {
    render(<HeroSection />);

    expect(screen.getByRole('option', { name: '1 Guest' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2 Guests' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3 Guests' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '4 Guests' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '5+ Guests' })).toBeInTheDocument();
  });

  it('should use custom locale prop', () => {
    render(<HeroSection locale="fr" />);
    expect(screen.getByText('Adventure Awaits')).toBeInTheDocument();
  });

  it('should handle form submission with default values', () => {
    render(<HeroSection />);

    const form = screen.getByRole('form', { name: /search form/i });
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(mockPush).toHaveBeenCalledWith('/en/search?adults=2');
  });

  it('should update state and handle form submission with custom values', () => {
    render(<HeroSection />);

    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Masai Mara' } });
    fireEvent.change(screen.getByLabelText('Check-in date'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Check-out date'), { target: { value: '2026-06-05' } });
    fireEvent.change(screen.getByLabelText('Number of guests'), { target: { value: '4' } });

    const form = screen.getByRole('form', { name: /search form/i });
    fireEvent.submit(form);

    expect(mockPush).toHaveBeenCalledWith(
      '/en/search?destination=Masai+Mara&checkIn=2026-06-01&checkOut=2026-06-05&adults=4'
    );
  });
});
