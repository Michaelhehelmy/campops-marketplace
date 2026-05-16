import { useEffect, useState } from "react";

export interface TenantBranding {
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customCss?: string;
}

export interface TenantTheme {
  mode?: "light" | "dark" | "auto";
  colors?: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  branding: TenantBranding;
  theme: TenantTheme;
  features: Record<string, boolean>;
}

interface UseTenantReturn {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to resolve tenant identity and branding at runtime
 * Uses VITE_SHOP_SLUG or hostname to identify the shop
 */
export function useTenant(): UseTenantReturn {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveTenant = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "https://api.campops.com";

      // Determine shop identifier
      const shopSlug = import.meta.env.VITE_SHOP_SLUG;
      const hostname = window.location.hostname;

      let url: string;

      if (shopSlug) {
        // Build-time configured shop slug
        url = `${API_BASE}/api/branding?slug=${encodeURIComponent(shopSlug)}`;
      } else {
        // Runtime resolution via hostname
        url = `${API_BASE}/api/tenant/resolve?host=${encodeURIComponent(hostname)}`;
      }

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        // Allow CORS for static frontend deployments
        mode: "cors",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Shop not found");
        }
        throw new Error(`Failed to resolve tenant: ${response.status}`);
      }

      const data = await response.json();

      if (shopSlug && data.branding) {
        // Direct branding response
        setTenant({
          id: data.id,
          name: data.name,
          slug: data.slug,
          subdomain: data.subdomain,
          branding: data.branding,
          theme: data.theme,
          features: data.features,
        });
      } else if (data.property) {
        // Tenant resolve response - fetch branding separately
        const brandingRes = await fetch(`${API_BASE}/api/branding?propertyId=${data.property.id}`, {
          mode: "cors",
        });

        if (brandingRes.ok) {
          const brandingData = await brandingRes.json();
          setTenant({
            id: data.property.id,
            name: brandingData.name || data.property.name,
            slug: data.property.slug,
            subdomain: data.property.subdomain || "",
            branding: brandingData.branding || {},
            theme: brandingData.theme || {},
            features: brandingData.features || {},
          });
        } else {
          // Fallback to basic tenant info
          setTenant({
            id: data.property.id,
            name: data.property.name,
            slug: data.property.slug,
            subdomain: "",
            branding: {},
            theme: {},
            features: {},
          });
        }
      } else {
        throw new Error("Invalid tenant response");
      }
    } catch (err) {
      console.error("[useTenant] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");

      // Fallback to demo/placeholder mode
      setTenant({
        id: "demo",
        name: "Demo Camp",
        slug: "demo",
        subdomain: "",
        branding: {},
        theme: { mode: "light" },
        features: {},
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveTenant();
  }, []);

  return {
    tenant,
    loading,
    error,
    refetch: resolveTenant,
  };
}

export default useTenant;
