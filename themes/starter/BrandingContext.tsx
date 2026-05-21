'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface Branding {
  name: string;
  tagline: string;
  colors: { primary: string; secondary: string; accent: string };
  fonts: { heading: string; body: string };
  logoUrl: string | null;
}

const defaultBranding: Branding = {
  name: 'My Marketplace',
  tagline: 'Find what you need',
  colors: { primary: '#2563eb', secondary: '#475569', accent: '#f59e0b' },
  fonts: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif' },
  logoUrl: null,
};

const BrandingCtx = createContext<Branding>(defaultBranding);

export function BrandingProvider({ children }: { children: ReactNode }) {
  return <BrandingCtx.Provider value={defaultBranding}>{children}</BrandingCtx.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingCtx);
}
