'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types (mirror BrandingConfig from src/app/api/branding/route.ts)
// ---------------------------------------------------------------------------

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  background?: string;
  surface?: string;
  text?: string;
  textMuted?: string;
}

export interface BrandingTypography {
  headingFont?: string;
  bodyFont?: string;
}

export interface BrandingLogo {
  url: string;
  darkUrl?: string;
  favicon?: string;
  appleTouchIcon?: string;
}

export interface BrandingData {
  name: string;
  tagline?: string;
  description?: string;
  logo?: BrandingLogo;
  colors?: BrandingColors;
  typography?: BrandingTypography;
  theme?: { mode?: 'light' | 'dark' | 'auto'; customCss?: string };
  seo?: { title?: string; description?: string };
}

// ---------------------------------------------------------------------------
// Defaults — used as last resort if API fetch fails
// ---------------------------------------------------------------------------

const DEFAULTS: BrandingData = {
  name: 'CampOps',
  tagline: '',
  colors: {
    primary: '#0f172a',
    secondary: '#3b82f6',
    accent: '#10b981',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textMuted: '#64748b',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface BrandingContextValue {
  branding: BrandingData;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULTS,
  loading: true,
});

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface BrandingProviderProps {
  children: React.ReactNode;
  /** Resolved at SSR time and passed as prop to avoid client-side flash. */
  siteId?: string;
  /** Fallback branding pre-fetched server-side, avoids flash of defaults. */
  initialBranding?: BrandingData;
}

export function BrandingProvider({ children, siteId, initialBranding }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingData>(initialBranding ?? DEFAULTS);
  const [loading, setLoading] = useState(!initialBranding);

  useEffect(() => {
    if (!siteId || initialBranding) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/branding?propertyId=${encodeURIComponent(siteId)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.branding) {
          setBranding(data.branding as BrandingData);
        }
      } catch {
        // Network error or abort — keep defaults/initial
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [siteId, initialBranding]);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>{children}</BrandingContext.Provider>
  );
}
