import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlobalErrorCapture } from "./GlobalErrorCapture";
import { BugReportButton } from "./BugReportButton";

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))] relative font-sans antialiased text-[hsl(var(--foreground))]">
      <GlobalErrorCapture />
      {/* Mobile Hamburger */}
      <div className="md:hidden absolute top-6 left-6 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white/90 backdrop-blur-md shadow-xl border-none rounded-2xl w-12 h-12"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          data-testid="hamburger-menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-charcoal/40 z-40 backdrop-blur-md transition-all duration-500"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="container mx-auto max-w-7xl px-6 md:px-10 pt-24 md:pt-10 pb-10">
          <Outlet />
        </div>
      </main>

      <BugReportButton />
    </div>
  );
}
