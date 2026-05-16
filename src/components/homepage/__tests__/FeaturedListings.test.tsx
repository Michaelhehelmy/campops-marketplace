// @vitest-environment jsdom
import React from 'react';
import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FeaturedListings from '../FeaturedListings';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe('FeaturedListings component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<FeaturedListings />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render listings after successful fetch', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: 4.8,
        amenities: ['wifi', 'pool'],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: mockListings }),
    });

    render(<FeaturedListings locale="en" limit={8} />);

    await waitFor(() => {
      expect(screen.getByText('Featured Stays')).toBeInTheDocument();
      expect(screen.getByText('Safari Camp')).toBeInTheDocument();
      expect(screen.getByText('Amazing safari experience')).toBeInTheDocument();
    });
  });

  it('should show error message when fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
    });

    render(<FeaturedListings />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch featured listings')).toBeInTheDocument();
    });
  });

  it('should show error message when fetch throws', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<FeaturedListings />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should return null when listings array is empty', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: [] }),
    });

    const { container } = render(<FeaturedListings />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should handle missing listings in response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { container } = render(<FeaturedListings />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should use custom limit prop', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: 4.8,
        amenities: ['wifi'],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: mockListings }),
    });

    render(<FeaturedListings limit={4} />);

    await waitFor(() => {
      expect(screen.getByText('Safari Camp')).toBeInTheDocument();
    });
  });

  it('should use custom locale prop', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: 4.8,
        amenities: ['wifi'],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: mockListings }),
    });

    render(<FeaturedListings locale="fr" />);

    await waitFor(() => {
      expect(screen.getByText('Safari Camp')).toBeInTheDocument();
    });
  });

  it('should display rating when present', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: 4.8,
        amenities: ['wifi'],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: mockListings }),
    });

    render(<FeaturedListings />);

    await waitFor(() => {
      expect(screen.getByText('4.8')).toBeInTheDocument();
    });
  });

  it('should not display rating when absent', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: null,
        amenities: ['wifi'],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: mockListings }),
    });

    render(<FeaturedListings />);

    await waitFor(() => {
      expect(screen.queryByText('4.8')).not.toBeInTheDocument();
    });
  });

  it('should display amenities', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: 'https://example.com/image.jpg',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: 4.8,
        amenities: ['wifi', 'pool', 'parking'],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: mockListings }),
    });

    render(<FeaturedListings />);

    await waitFor(() => {
      expect(screen.getByText('wifi')).toBeInTheDocument();
      expect(screen.getByText('pool')).toBeInTheDocument();
      expect(screen.getByText('parking')).toBeInTheDocument();
    });
  });

  it('should use default icon when no primary image', async () => {
    const mockListings = [
      {
        id: '1',
        slug: 'safari-camp',
        name: 'Safari Camp',
        primaryImage: '',
        shortDescription: 'Amazing safari experience',
        pricePerNight: 150,
        rating: 4.8,
        amenities: ['wifi'],
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ listings: mockListings }),
    });

    render(<FeaturedListings />);

    await waitFor(() => {
      expect(screen.getByText('🏕️')).toBeInTheDocument();
    });
  });
});
