import { useBranding } from "@/contexts/BrandingContext";

interface BrandLogoProps {
  className?: string;
  variant?: "full" | "icon";
  color?: "default" | "white";
}

export function BrandLogo({ className = "", variant = "full", color = "default" }: BrandLogoProps) {
  const branding = useBranding();

  // Use the logoUrl from branding config, fallback to default if not set
  const logoUrl = branding.logoUrl || "/pwa-512x512.png";

  return (
    <div className={`flex flex-col items-center gap-0 ${className}`}>
      <img
        src={logoUrl}
        alt={branding.appName}
        className={variant === "icon" ? "w-12 h-12 object-contain" : "w-20 h-20 object-contain"}
      />
      {variant === "full" && (
        <span
          className={`text-lg font-serif font-bold leading-none uppercase tracking-widest ${color === "white" ? "text-white" : "text-charcoal"}`}
        >
          {branding.appName}
        </span>
      )}
    </div>
  );
}
