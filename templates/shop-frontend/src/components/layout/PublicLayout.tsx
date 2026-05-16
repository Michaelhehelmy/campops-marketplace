import { Outlet, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { BedDouble, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth, getDashboardPath } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useMenu } from "@/hooks/queries/useMenu";

import { BrandLogo } from "@/components/branding/BrandLogo";

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const branding = useBranding();
  const { data: menu } = useMenu("main");

  const defaultLinks = [
    { label: "Rooms", path: "/rooms" },
    { label: "Availability", path: "/availability" },
    { label: "Blog", path: "/blog" },
    { label: "Gallery", path: "/gallery" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  const navLinks = menu?.structure?.length ? menu.structure : defaultLinks;

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-7xl flex items-center justify-between px-6 h-20">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo variant="icon" className="w-10 h-10" />
            <span className="text-xl font-serif font-bold text-charcoal tracking-wider uppercase">
              {branding.appName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.id || link.path}
                to={link.path || "#"}
                className="text-muted-foreground hover:text-foreground transition-colors"
                target={link.path?.startsWith("http") ? "_blank" : undefined}
                rel={link.path?.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && user ? (
              <Button asChild size="sm">
                <Link to={getDashboardPath(user.role)}>Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            data-testid="mobile-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t px-6 py-4 space-y-3 bg-card">
            {navLinks.map((link) => (
              <Link
                key={link.id || link.path}
                to={link.path || "#"}
                className="block text-sm"
                onClick={() => setMenuOpen(false)}
                target={link.path?.startsWith("http") ? "_blank" : undefined}
                rel={link.path?.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && user ? (
              <Button asChild size="sm" className="w-full">
                <Link to={getDashboardPath(user.role)} onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="w-full">
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        data-testid="public-footer"
        className="border-t py-8 text-center text-sm text-muted-foreground"
      >
        <div className="container mx-auto max-w-7xl px-6">
          &copy; {new Date().getFullYear()} {branding.companyName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
