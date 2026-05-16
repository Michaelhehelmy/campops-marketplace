/**
 * React Query client configuration
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * React Query client with default options
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401 or 403
        if (error instanceof Error) {
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 403) return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Expose queryClient to window for E2E testing
if (typeof window !== "undefined") {
  (window as any).queryClient = queryClient;
}

/**
 * Query key factory for type-safe cache management
 */
export const queryKeys = {
  // Auth
  user: ["user"] as const,
  dashboard: ["dashboard"] as const,

  // Guests
  guests: ["guests"] as const,
  guest: (id: string) => ["guests", id] as const,
  guestMe: () => ["guests", "me"] as const,

  // Rooms
  rooms: ["rooms"] as const,
  room: (id: string) => ["rooms", id] as const,

  // Reservations
  reservations: ["reservations"] as const,
  reservation: (id: string) => ["reservations", id] as const,

  // Orders
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  posItems: ["pos_items"] as const,
  kitchenOrders: ["orders", "kitchen"] as const,

  // Billing
  folios: ["folios"] as const,
  folio: (id: string) => ["folios", id] as const,

  // Inventory
  inventory: ["inventory"] as const,

  // Pages (CMS)
  pages: ["pages"] as const,
  page: (id: string) => ["pages", id] as const,
  pageBySlug: (slug: string) => ["pages", "slug", slug] as const,

  // Blog
  blogPosts: ["blog_posts"] as const,
  blogPost: (id: string) => ["blog_posts", id] as const,
  blogPostBySlug: (slug: string) => ["blog_posts", "slug", slug] as const,

  // Housekeeping
  housekeepingTasks: ["housekeeping_tasks"] as const,

  // Staff shifts
  shifts: ["shifts"] as const,

  // Activities
  activities: ["activities"] as const,
  activityBookings: ["activity_bookings"] as const,

  // Loyalty
  loyaltyTransactions: ["loyalty_transactions"] as const,
  miningSession: ["mining_session"] as const,

  // POS Categories
  posCategories: ["pos_categories"] as const,

  // Admin Rooms (full CRUD with images/seasonal)
  adminRooms: ["admin_rooms"] as const,
  adminRoom: (id: string) => ["admin_rooms", id] as const,

  // Admin
  users: ["users"] as const,
  user_admin: (id: string) => ["users", id] as const,
  roles: ["roles"] as const,
  ratePlans: ["rate_plans"] as const,
  media: ["media"] as const,
  settings: ["settings"] as const,
  procurement: ["procurement"] as const,

  // Reports
  revenueReport: (start: string, end: string) => ["reports", "revenue", start, end] as const,
  hospitalityReport: (days: number) => ["reports", "hospitality", days] as const,
  housekeepingPredictions: ["reports", "predictions", "housekeeping"] as const,

  // Audit logs
  auditLogs: ["audit_logs"] as const,

  // Feedback
  feedback: ["guest_feedback"] as const,

  // Webhook logs
  webhookLogs: ["webhook_logs"] as const,

  // Tax configuration
  taxConfigurations: ["tax_configurations"] as const,

  // System Administration
  systemInfo: ["system_info"] as const,
  systemBackups: ["system_backups"] as const,

  // Activity schedules
  activitySchedules: (activityId?: string) => ["activity_schedules", activityId] as const,

  // Staff
  staffProfile: ["staff_profile"] as const,
  staffFinances: ["staff_finances"] as const,
  staffAllowanceRequests: ["staff_allowance_requests"] as const,

  // Public
  publicRooms: ["public_rooms"] as const,
  availability: (checkIn: string, checkOut: string) => ["availability", checkIn, checkOut] as const,
  publicFolio: (reservationId: string) => ["public_folio", reservationId] as const,

  // Transportation
  transport: {
    vehicles: ["transport", "vehicles"] as const,
    vehicle: (id: string) => ["transport", "vehicles", id] as const,
    drivers: ["transport", "drivers"] as const,
    driver: (id: string) => ["transport", "drivers", id] as const,
    transfers: ["transport", "transfers"] as const,
    transfer: (id: string) => ["transport", "transfers", id] as const,
  },
} as const;
