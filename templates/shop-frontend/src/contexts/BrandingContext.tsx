/**
 * BrandingContext
 * Fetches branding config from GET /api/branding on mount.
 * Falls back to VITE_* env vars (build-time) while loading.
 * Exposes useBranding() for all components.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface BrandingConfig {
  appName: string;
  shortName: string;
  companyName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  domain: string;
  loginButtonLabel: string;
  // Dynamic Image Constants
  heroMain: string;
  heroThumb: string;
  dashboardHero: string;
  hutImage: string;
  kitchenImage: string;
  desertImage: string;
  starsImage: string;
  sinaiLandscape: string;
  sunsetImage: string;
  cabinImage: string;
  mountainImage: string;
  beachImage: string;
  roomInterior: string;
}

const buildTimeDefaults: BrandingConfig = {
  appName: import.meta.env.VITE_APP_NAME || "SinaiCamps",
  shortName: import.meta.env.VITE_APP_SHORT_NAME || import.meta.env.VITE_APP_NAME || "SinaiCamps",
  companyName: import.meta.env.VITE_COMPANY_NAME || import.meta.env.VITE_APP_NAME || "SinaiCamps",
  tagline: import.meta.env.VITE_APP_TAGLINE || "Hospitality Management",
  logoUrl: import.meta.env.VITE_APP_LOGO_URL || "/logo.png",
  faviconUrl: import.meta.env.VITE_APP_FAVICON_URL || "/favicon.ico",
  primaryColor: import.meta.env.VITE_APP_PRIMARY_COLOR || "#0f172a",
  accentColor: import.meta.env.VITE_APP_ACCENT_COLOR || "#0ea5e9",
  backgroundColor: import.meta.env.VITE_APP_BACKGROUND_COLOR || "#ffffff",
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || "",
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || "",
  website: import.meta.env.VITE_DOMAIN || "",
  domain: import.meta.env.VITE_DOMAIN || "",
  loginButtonLabel:
    import.meta.env.VITE_APP_LOGIN_LABEL || `Enter ${import.meta.env.VITE_APP_NAME || "SinaiCamps"}`,
  // Dynamic Image Constants
  heroMain:
    import.meta.env.VITE_IMG_HERO_MAIN ||
    "https://images.unsplash.com/photo-1682686580849-3e7f67df4015?auto=format&fit=crop&q=80&w=2000",
  heroThumb:
    import.meta.env.VITE_IMG_HERO_THUMB ||
    "https://images.unsplash.com/photo-1682686580849-3e7f67df4015?auto=format&fit=crop&q=80&w=800",
  dashboardHero:
    import.meta.env.VITE_IMG_DASHBOARD_HERO ||
    "https://i.postimg.cc/ZqnKZ4m9/IMG-20250902-WA0068.jpg",
  hutImage: import.meta.env.VITE_IMG_HUT || "https://i.postimg.cc/ZqnKZ4m9/IMG-20250902-WA0068.jpg",
  kitchenImage:
    import.meta.env.VITE_IMG_KITCHEN ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
  desertImage:
    import.meta.env.VITE_IMG_DESERT ||
    "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&q=80&w=800",
  starsImage:
    import.meta.env.VITE_IMG_STARS ||
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=800",
  sinaiLandscape:
    import.meta.env.VITE_IMG_SINAI_LANDSCAPE ||
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=1200",
  sunsetImage:
    import.meta.env.VITE_IMG_SUNSET ||
    "https://images.unsplash.com/photo-1544123234-5858f967f897?auto=format&fit=crop&q=80&w=1200",
  cabinImage:
    import.meta.env.VITE_IMG_CABIN ||
    "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=1200",
  mountainImage:
    import.meta.env.VITE_IMG_MOUNTAIN ||
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200",
  beachImage:
    import.meta.env.VITE_IMG_BEACH ||
    "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=1200",
  roomInterior:
    import.meta.env.VITE_IMG_ROOM_INTERIOR ||
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200",
};

const BrandingContext = createContext<BrandingConfig>(buildTimeDefaults);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(buildTimeDefaults);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "";

    // 1. Resolve Tenant via Marketplace
    fetch(`${apiBase}/api/tenant/resolve?host=${window.location.host}`)
      .then((res) => res.json())
      .then((resolution) => {
        const propertyId = resolution.property?.id;
        if (propertyId) {
          (window as any).__TENANT_PROPERTY_ID__ = propertyId;

          // 2. Fetch Branding for this specific tenant
          return fetch(`${apiBase}/api/branding?propertyId=${propertyId}`);
        }
        throw new Error("Could not resolve tenant");
      })
      .then((res) => {
        if (!res || !res.ok) throw new Error("branding fetch failed");
        return res.json();
      })
      .then((data: any) => {
        const mergedBranding = {
          ...buildTimeDefaults,
          ...data.branding,
          appName: data.name || data.branding?.appName || buildTimeDefaults.appName,
        };
        setBranding(mergedBranding);
        document.title = mergedBranding.appName;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute("content", `${data.appName} - ${data.tagline}`);
        }

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
          metaTheme.setAttribute("content", data.primaryColor);
        }

        document.documentElement.style.setProperty("--color-primary-brand", data.primaryColor);
        document.documentElement.style.setProperty("--color-accent-brand", data.accentColor);
      })
      .catch(() => {
        document.title = buildTimeDefaults.appName;
      });
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingConfig {
  return useContext(BrandingContext);
}
