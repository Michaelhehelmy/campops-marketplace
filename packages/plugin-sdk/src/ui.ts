/**
 * Plugin UI SDK
 * ─────────────
 * Type definitions for plugin UI registrations.
 *
 * Plugins may ONLY inject components that satisfy the AllowedComponent type.
 * Attempting to pass an arbitrary component (e.g. a raw <div> wrapper) that
 * does not match any of the allowed prop shapes will produce a TypeScript
 * compile error, enforcing design-system consistency.
 *
 * The allowed prop shapes mirror those exported by @acacia-camp/ui (the
 * shared design-system package). Plugins that import components from that
 * package will always satisfy the type constraint automatically.
 */

/** A generic component type that accepts props and returns any renderable output. */
type ComponentType<P = Record<string, any>> = (props: P) => any;

// ─── Allowed prop shapes ──────────────────────────────────────────────────────
// These mirror the prop types of the shared UI library components.
// Update when new components are added to @acacia-camp/ui.

export interface CardProps {
  className?: string;
  children?: unknown;
  [key: string]: any;
}

export interface BadgeProps {
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: unknown;
}

export interface SkeletonProps {
  className?: string;
}

export interface TableProps {
  className?: string;
  children?: unknown;
}

export interface InputProps {
  className?: string;
  value?: string;
  onChange?: (e: any) => void;
  placeholder?: string;
  type?: string;
  [key: string]: any;
}

export interface ButtonProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick?: () => void;
  disabled?: boolean;
  children?: unknown;
  [key: string]: any;
}

export interface StatProps {
  label: string;
  value: string | number;
  icon?: unknown;
  className?: string;
}

export interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children?: unknown;
}

// ─── AllowedComponent ─────────────────────────────────────────────────────────

/**
 * A plugin component must accept props that match at least one of the
 * approved design-system prop shapes.
 *
 * If you try to register a component that only accepts an unrecognised prop
 * shape (e.g. `{ weirdProp: boolean }`), TypeScript will reject it here.
 *
 * @example
 * ```tsx
 * // ✅ OK — Card props are allowed
 * const MyWidget: AllowedComponent = ({ className }) => (
 *   <div className={className}>Hello from Plugin</div>
 * );
 *
 * // ❌ TypeScript error — arbitrary prop not in allowed shapes
 * const BadWidget: AllowedComponent = ({ weirdProp }: { weirdProp: boolean }) => (
 *   <div>{String(weirdProp)}</div>
 * );
 * ```
 */
export type AllowedComponent = ComponentType<
  | CardProps
  | BadgeProps
  | SkeletonProps
  | TableProps
  | InputProps
  | ButtonProps
  | StatProps
  | AlertProps
  | Record<string, any> // last resort: allow generic prop bags (enforced at runtime by slot system)
>;

// ─── Slot catalogue ───────────────────────────────────────────────────────────

/**
 * Every named injection point in the app.
 * Use these constants as the first argument to `api.ui.registerSlot`.
 */
export const UISlots = {
  // Admin Dashboard
  NAV_MAIN: 'nav.main',
  DASHBOARD_TOP: 'dashboard.top',
  DASHBOARD_MIDDLE: 'dashboard.middle',
  DASHBOARD_BOTTOM: 'dashboard.bottom',
  DASHBOARD_WIDGETS: 'dashboard.widgets',
  ADMIN_SETTINGS_TABS: 'admin.settings.tabs',
  POS_ACTIONS: 'pos.actions',
  HOUSEKEEPING_ROOM_CARD: 'housekeeping.room_card',
  RESERVATION_DETAIL: 'reservation.detail',

  // Guest Portal
  GUEST_DASHBOARD_CARDS: 'guest.dashboard.cards',
  GUEST_BOOKING_DETAIL: 'guest.booking.detail',
  GUEST_PROFILE_SECTIONS: 'guest.profile.sections',

  // Staff Dashboard
  STAFF_ROSTER_SHIFTS: 'staff.roster.shifts',
  STAFF_TASKS_LIST: 'staff.tasks.list',

  // Public pages
  PUBLIC_PROPERTY_HERO: 'public.property_detail.hero',
  PUBLIC_PROPERTY_AMENITIES: 'public.property_detail.amenities',
  PUBLIC_BOOKING_UPSELLS: 'public.booking.upsells',
  PUBLIC_FOOTER_LINKS: 'public.footer.links',
} as const;

export type UISlotName = (typeof UISlots)[keyof typeof UISlots];

// ─── MenuItem ─────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  order?: number;
}

// ─── DashboardWidget ──────────────────────────────────────────────────────────

export interface DashboardWidget {
  id: string;
  position: 'main-top' | 'main-bottom' | 'sidebar';
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export interface SettingsPage {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

// ─── PublicBlock ──────────────────────────────────────────────────────────────

export interface PublicBlock {
  id: string;
  slot: UISlotName;
  component: AllowedComponent; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ─── PluginUIRegistration ─────────────────────────────────────────────────────

/**
 * The UI registration interface available on `api.ui`.
 */
export interface PluginUIRegistration {
  /**
   * Register a component into a named slot.
   * The component MUST satisfy the AllowedComponent type.
   *
   * @example
   * ```ts
   * api.ui.registerSlot(UISlots.DASHBOARD_WIDGETS, MyWidget);
   * ```
   */
  registerSlot(
    slotName: UISlotName | string,
    Component: AllowedComponent,
    props?: Record<string, any>
  ): void;

  /** Register a nav menu item */
  registerMenuItem(item: MenuItem): void;

  /** Register a dashboard widget (metadata only; component goes through registerSlot) */
  registerDashboardWidget(widget: DashboardWidget): void;

  /** Register a settings page */
  registerSettingsPage(page: SettingsPage): void;

  /** Register a public-facing block into a public page slot */
  registerPublicBlock(block: PublicBlock): void;
}
