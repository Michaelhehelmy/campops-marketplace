import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Menu types supported
const VALID_MENU_TYPES = ['main', 'footer', 'sidebar', 'mobile', 'admin'] as const;
type MenuType = (typeof VALID_MENU_TYPES)[number];

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  roles?: string[];
  children?: MenuItem[];
  order: number;
  isVisible: boolean;
}

interface MenuConfig {
  type: MenuType;
  items: MenuItem[];
  branding?: {
    logo?: string;
    showLogo: boolean;
  };
}

// Default menus for each type
const DEFAULT_MENUS: Record<MenuType, MenuItem[]> = {
  main: [
    { id: 'home', label: 'Home', path: '/', order: 1, isVisible: true },
    { id: 'rooms', label: 'Rooms', path: '/rooms', order: 2, isVisible: true },
    { id: 'booking', label: 'Book Now', path: '/booking', order: 3, isVisible: true },
    { id: 'gallery', label: 'Gallery', path: '/gallery', order: 4, isVisible: true },
    { id: 'excursions', label: 'Activities', path: '/excursions', order: 5, isVisible: true },
    { id: 'menu', label: 'Dining', path: '/menu', order: 6, isVisible: true },
    { id: 'contact', label: 'Contact', path: '/contact', order: 7, isVisible: true },
    { id: 'about', label: 'About', path: '/about', order: 8, isVisible: true },
  ],
  footer: [
    { id: 'privacy', label: 'Privacy Policy', path: '/privacy', order: 1, isVisible: true },
    { id: 'terms', label: 'Terms of Service', path: '/terms', order: 2, isVisible: true },
    { id: 'contact', label: 'Contact Us', path: '/contact', order: 3, isVisible: true },
  ],
  sidebar: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'layout-dashboard',
      order: 1,
      isVisible: true,
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/guest/profile',
      icon: 'user',
      roles: ['guest'],
      order: 2,
      isVisible: true,
    },
    {
      id: 'bookings',
      label: 'My Bookings',
      path: '/guest/stay',
      icon: 'calendar',
      roles: ['guest'],
      order: 3,
      isVisible: true,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      path: '/guest/invoices',
      icon: 'receipt',
      roles: ['guest'],
      order: 4,
      isVisible: true,
    },
  ],
  mobile: [
    { id: 'home', label: 'Home', path: '/', icon: 'home', order: 1, isVisible: true },
    { id: 'rooms', label: 'Rooms', path: '/rooms', icon: 'bed', order: 2, isVisible: true },
    { id: 'booking', label: 'Book', path: '/booking', icon: 'calendar', order: 3, isVisible: true },
    { id: 'menu', label: 'Menu', path: '/menu', icon: 'utensils', order: 4, isVisible: true },
    { id: 'contact', label: 'Contact', path: '/contact', icon: 'phone', order: 5, isVisible: true },
  ],
  admin: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: 'layout-dashboard',
      order: 1,
      isVisible: true,
    },
    { id: 'rooms', label: 'Rooms', path: '/admin/rooms', icon: 'bed', order: 2, isVisible: true },
    {
      id: 'bookings',
      label: 'Bookings',
      path: '/admin/bookings',
      icon: 'calendar',
      order: 3,
      isVisible: true,
    },
    { id: 'users', label: 'Users', path: '/admin/users', icon: 'users', order: 4, isVisible: true },
    {
      id: 'finances',
      label: 'Finances',
      path: '/admin/finances',
      icon: 'dollar-sign',
      order: 5,
      isVisible: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/admin/settings',
      icon: 'settings',
      order: 6,
      isVisible: true,
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/admin/reports',
      icon: 'bar-chart',
      order: 7,
      isVisible: true,
    },
    {
      id: 'plugins',
      label: 'Plugins',
      path: '/admin/plugins',
      icon: 'puzzle',
      order: 8,
      isVisible: true,
    },
  ],
};

export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const type = params.type as MenuType;

    if (!VALID_MENU_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid menu type. Valid types: ${VALID_MENU_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get property from query or subdomain
    const slug = req.nextUrl.searchParams.get('slug');
    const subdomain =
      req.nextUrl.searchParams.get('subdomain') || req.headers.get('host')?.split('.')[0];

    let property: any = null;

    if (slug) {
      property = await db
        .prepare(
          `
        SELECT id, settings FROM properties WHERE slug = $1 AND is_active = true
      `
        )
        .get(slug);
    } else if (subdomain && subdomain !== 'sinaicamps' && subdomain !== 'www') {
      property = await db
        .prepare(
          `
        SELECT id, settings FROM properties WHERE subdomain = $1 AND is_active = true
      `
        )
        .get(subdomain);
    }

    // Get custom menu from property settings or use default
    const settings = property?.settings
      ? typeof property.settings === 'string'
        ? JSON.parse(property.settings)
        : property.settings
      : {};

    const customMenu = settings?.menus?.[type];
    const items = customMenu || DEFAULT_MENUS[type];

    const menu: MenuConfig = {
      type,
      items: items.sort((a: MenuItem, b: MenuItem) => a.order - b.order),
      branding: {
        showLogo: true,
        logo: settings?.branding?.logo?.url,
      },
    };

    return NextResponse.json(menu, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (err: any) {
    console.error(`[Menus API] Error fetching ${params.type} menu:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
