/**
 * Centralized image constants for the application.
 * These are used as default/fallback images throughout the UI.
 *
 * Note: Components should ideally use the 'useBranding()' hook
 * to get the live configuration from the server.
 */

export const DEFAULT_IMAGES = {
  // Hero / Landing
  HERO_MAIN:
    import.meta.env.VITE_IMG_HERO_MAIN ||
    "https://images.unsplash.com/photo-1682686580849-3e7f67df4015?auto=format&fit=crop&q=80&w=2000",
  HERO_THUMB:
    import.meta.env.VITE_IMG_HERO_THUMB ||
    "https://images.unsplash.com/photo-1682686580849-3e7f67df4015?auto=format&fit=crop&q=80&w=800",
  DASHBOARD_HERO:
    import.meta.env.VITE_IMG_DASHBOARD_HERO ||
    "https://i.postimg.cc/ZqnKZ4m9/IMG-20250902-WA0068.jpg",

  // Experience / Features
  HUT: import.meta.env.VITE_IMG_HUT || "https://i.postimg.cc/ZqnKZ4m9/IMG-20250902-WA0068.jpg",
  KITCHEN:
    import.meta.env.VITE_IMG_KITCHEN ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
  DESERT:
    import.meta.env.VITE_IMG_DESERT ||
    "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&q=80&w=800",
  STARS:
    import.meta.env.VITE_IMG_STARS ||
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=800",

  // Gallery / Misc
  SINAI_LANDSCAPE:
    import.meta.env.VITE_IMG_SINAI_LANDSCAPE ||
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=1200",

  // Editor Placeholders
  BLOCK_PLACEHOLDER:
    "https://images.unsplash.com/photo-1544123234-5858f967f897?auto=format&fit=crop&q=80&w=2000",
  VIDEO_PLACEHOLDER: "https://www.youtube.com/embed/dQw4w9WgXcQ",

  // Additional Seeds / Templates
  SUNSET:
    import.meta.env.VITE_IMG_SUNSET ||
    "https://images.unsplash.com/photo-1544123234-5858f967f897?auto=format&fit=crop&q=80&w=1200",
  CABIN:
    import.meta.env.VITE_IMG_CABIN ||
    "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=1200",
  MOUNTAIN:
    import.meta.env.VITE_IMG_MOUNTAIN ||
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200",
  BEACH:
    import.meta.env.VITE_IMG_BEACH ||
    "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=1200",
  ROOM_INTERIOR:
    import.meta.env.VITE_IMG_ROOM_INTERIOR ||
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200",
};
