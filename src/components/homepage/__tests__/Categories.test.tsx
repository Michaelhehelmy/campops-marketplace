// @vitest-environment jsdom
import React from 'react';
import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Categories from '../Categories';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Categories component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<Categories />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render categories after successful fetch', async () => {
    const mockCategories = [
      {
        id: '1',
        name: 'Camping',
        slug: 'camping',
        icon: '🏕️',
        description: 'Outdoor camping',
        count: 10,
      },
      { id: '2', name: 'Lodges', slug: 'lodges', icon: '🏠', description: 'Cozy lodges', count: 5 },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<Categories locale="en" />);

    await waitFor(() => {
      expect(screen.getByText('Browse by Category')).toBeInTheDocument();
      expect(screen.getByText('Camping')).toBeInTheDocument();
      expect(screen.getByText('Lodges')).toBeInTheDocument();
    });
  });

  it('should show error message when fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
    });

    render(<Categories />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch categories')).toBeInTheDocument();
    });
  });

  it('should show error message when fetch throws', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<Categories />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should return null when categories array is empty', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: [] }),
    });

    const { container } = render(<Categories />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should handle missing categories in response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { container } = render(<Categories />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should use custom locale prop', async () => {
    const mockCategories = [
      {
        id: '1',
        name: 'Camping',
        slug: 'camping',
        icon: '🏕️',
        description: 'Outdoor camping',
        count: 10,
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<Categories locale="fr" />);

    await waitFor(() => {
      expect(screen.getByText('Camping')).toBeInTheDocument();
    });
  });

  it('should display category count', async () => {
    const mockCategories = [
      {
        id: '1',
        name: 'Camping',
        slug: 'camping',
        icon: '🏕️',
        description: 'Outdoor camping',
        count: 42,
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<Categories />);

    await waitFor(() => {
      expect(screen.getByText('42 properties')).toBeInTheDocument();
    });
  });

  it('should use default icon when not provided', async () => {
    const mockCategories = [
      {
        id: '1',
        name: 'Camping',
        slug: 'camping',
        icon: '',
        description: 'Outdoor camping',
        count: 10,
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    });

    render(<Categories />);

    await waitFor(() => {
      expect(screen.getByText('🏕️')).toBeInTheDocument();
    });
  });
});
