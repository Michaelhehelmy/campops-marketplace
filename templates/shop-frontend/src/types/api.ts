/**
 * TypeScript type definitions for Acacia Camp API
 * Aligned with BACKEND_API_REFERENCE.md
 */

// ============================================
// BASE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ============================================
// USER & AUTH
// ============================================

/**
 * User roles:
 * - marketplace_master: global super-admin for the marketplace platform
 * - listing_admin: admin scoped to one or more listings (listing_ids)
 * - admin: legacy alias for listing_admin (single-listing deployments)
 * - manager/chef/pos/housekeeping/staff: operational roles within a listing
 * - guest: end-user / traveller
 */
export type UserRole =
  | "marketplace_master"
  | "listing_admin"
  | "admin"
  | "manager"
  | "staff"
  | "chef"
  | "pos"
  | "housekeeping"
  | "guest";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  permissions: string[];
  /** IDs of listings this user can manage (for listing_admin / staff roles) */
  listing_ids?: string[];
  guest_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  referral_code?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    guest_id?: string;
    is_verified: boolean;
  };
  role: string;
  permissions: string[];
  /** Listing IDs the authenticated user may manage (SSO for listing admins) */
  listing_ids?: string[];
}

// ============================================
// GUESTS
// ============================================

export interface Guest {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  language: string;
  dietary_preferences: string[];
  vip_level: "regular" | "silver" | "gold" | "platinum";
  loyalty_points: number;
  bio?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  is_verified?: boolean;
}

// ============================================
// ROOMS
// ============================================

export interface Room {
  id: string;
  name: string;
  type: string;
  status: "available" | "occupied" | "dirty" | "maintenance";
  capacity: number;
  amenities?: string[];
  images?: string[];
  rate_plans?: {
    base_price: number;
    currency: string;
  };
  created_at: string;
  updated_at: string;
}

// ============================================
// RESERVATIONS
// ============================================

export interface Reservation {
  id: string;
  guest_id: string;
  guest_name?: string;
  room_id?: string;
  room_name?: string;
  type: "stay" | "day_use" | "event";
  status: "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
  check_in?: string;
  check_out?: string;
  guest_count: number;
  notes?: string;
  folio_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// POS & ORDERS
// ============================================

export interface POSItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  category_name?: string;
  is_available: boolean;
  requires_preparation: boolean;
  allergens?: string[];
  image_url?: string;
  sku?: string;
  stock_quantity?: number;
  low_stock_threshold?: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  pos_item_id: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  status: "placed" | "preparing" | "ready" | "delivered";
}

export interface Order {
  id: string;
  guest_id?: string;
  guest_name?: string;
  room_id?: string;
  table_id?: string;
  type: "dine_in" | "room_service" | "takeaway";
  status: "placed" | "preparing" | "ready" | "delivered";
  total_amount: number;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// ============================================
// BILLING
// ============================================

export interface FolioCharge {
  id: string;
  folio_id: string;
  description: string;
  category: "room" | "pos" | "service" | "tax" | "other" | string;
  amount: number;
  total_price?: number;
  quantity?: number;
  unit_price?: number;
  posted_at?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  folio_id: string;
  amount: number;
  method: "cash" | "card" | "mpesa" | "bank_transfer" | "points" | "paypal";
  reference?: string;
  points_redeemed?: number;
  created_at: string;
}

export interface GuestFolio {
  id: string;
  guest_id: string;
  reservation_id?: string;
  status: "open" | "closed" | "pending";
  total_charges: number;
  total_payments: number;
  balance: number;
  currency: string;
  charges: FolioCharge[];
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

// ============================================
// PAGE BUILDER (CMS)
// ============================================

export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "gallery"
  | "button"
  | "video"
  | "embed"
  | "bookingForm"
  | "contactForm"
  | "hero"
  | "cta"
  | "menuPreview"
  | "map"
  | "testimonials"
  | "features"
  | "spacer"
  | "columns"
  | "html"
  | "form"
  | "form-text-input"
  | "form-textarea"
  | "form-select"
  | "form-checkbox"
  | "form-submit-button";

export interface FormField {
  id: string;
  type:
    | "form-text-input"
    | "form-textarea"
    | "form-select"
    | "form-checkbox"
    | "form-submit-button";
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select
  rows?: number; // for textarea
  checked?: boolean; // for checkbox
  style?: "primary" | "secondary"; // for button
}

export interface FormBlockContent {
  apiEndpoint?: string;
  method?: "GET" | "POST" | "PUT";
  functionId?: string;
  successMessage?: string;
  errorMessage?: string;
  fields: FormField[];
  title?: string;
  description?: string;
  submitLabel?: string;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  order: number;
  content: Record<string, unknown>;
  styles?: Record<string, string>;
  settings?: {
    fullWidth?: boolean;
    padding?: string;
    backgroundColor?: string;
    hideOnMobile?: boolean;
    hideOnTablet?: boolean;
    hideOnDesktop?: boolean;
  };
}

export interface PageSEO {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  content: PageBlock[];
  seo: PageSEO;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PageListResponse {
  data: CustomPage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ============================================
// MENUS
// ============================================

export interface MenuItem {
  id: string;
  label: string;
  path: string; // URL or slug
  children?: MenuItem[];
  icon?: string;
  isExternal?: boolean;
}

export interface Menu {
  id: string;
  name: string;
  structure: MenuItem[];
  created_at: string;
  updated_at: string;
}

export interface MenuResponse {
  success: boolean;
  data: Menu;
}

// ============================================
// BLOG
// ============================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: "draft" | "published";
  featured_image?: string;
  author_name?: string;
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// STAFF
// ============================================

export interface StaffShift {
  id: string;
  user_id: string;
  user_name?: string;
  role: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
}

export interface HousekeepingTask {
  id: string;
  room_id: string;
  room_name?: string;
  type: "cleaning" | "turnover" | "maintenance" | "inspection";
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to?: string;
  assigned_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// ACTIVITIES & LOYALTY
// ============================================

export interface Activity {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration_minutes: number;
  max_capacity: number;
  base_price: number;
  image_url?: string;
  requirements?: string;
  equipment_needed?: string;
  is_active: boolean;
  price?: number;
  created_at: string;
  updated_at?: string;
}

export interface ActivityBooking {
  id: string;
  activity_id: string;
  activity_name?: string;
  guest_id: string;
  date: string;
  status: "booked" | "confirmed" | "cancelled" | "completed";
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  guest_id: string;
  points: number;
  type: "earned" | "redeemed" | "mined" | "bonus";
  description: string;
  created_at: string;
}

export interface MiningSession {
  id: string;
  guest_id: string;
  status: "active" | "paused" | "completed";
  points_earned: number; // frontend alias
  beats_earned: number; // DB column
  elapsed_hours?: number;
  started_at: string;
  ended_at?: string;
  rate_applied?: number;
}

// ============================================
// ADMIN: USERS & ROLES
// ============================================

export interface UserAdmin {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

// ============================================
// ADMIN: RATE PLANS
// ============================================

export interface RatePlan {
  id: string;
  name: string;
  room_type?: string;
  base_price: number;
  currency: string;
  deposit_percentage?: number;
  cancellation_policy?: string;
  min_nights?: number;
  max_nights?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// ADMIN: MEDIA
// ============================================

export interface MediaItem {
  id: string;
  filename: string;
  original_filename?: string;
  url: string;
  type: "image" | "video";
  size: number;
  alt_text?: string;
  gallery?: string;
  is_public: boolean;
  uploaded_by?: string;
  metadata?: {
    caption?: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

// ============================================
// ADMIN: SETTINGS
// ============================================

export interface Setting {
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
  description?: string;
  category: string;
}

// ============================================
// PROCUREMENT
// ============================================

export interface ProcurementRecord {
  id: string;
  item_id: string;
  item_name: string;
  requested_quantity: number;
  received_quantity?: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier_id?: string;
  supplier?: string;
  status: "draft" | "approved" | "rejected" | "received";
  requested_by?: string;
  approved_by?: string;
  received_date?: string;
  received_by?: string;
  notes?: string;
  created_at: string;
}

// ============================================
// INVENTORY
// ============================================

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  par_level: number;
  quantity: number;
  current_stock: number;
  reorder_point: number;
  supplier_id?: string;
  cost: number;
  location?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// RECIPES
// ============================================

export interface Recipe {
  id: string;
  name: string;
  category: string;
  image: string;
  cost_per_serving: number;
  selling_price: number;
  prep_time: string;
  ingredients_count: number;
  margin: number;
  health_info?: string;
  ingredients?: any[];
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity_required: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// SUPPLIERS
// ============================================

export interface Supplier {
  id: string;
  name: string;
  category?: string;
  rating: number;
  reliability: number;
  last_order?: string;
  total_spent: number;
  item_count: number;
  contact_email?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// WASTE LOG
// ============================================

export interface WasteLogEntry {
  id: string;
  inventory_item_id?: string;
  item: string;
  quantity: number;
  unit: string;
  reason: string;
  cost: number;
  date: string;
  created_at: string;
}

// ============================================
// STAFF PROFILE
// ============================================

export interface StaffProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// STAFF FINANCES
// ============================================

export interface StaffFinance {
  id: string;
  user_id: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  currency: string;
  period_start: string;
  period_end: string;
  status: "pending" | "paid" | "verified";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffAllowanceRequest {
  id: string;
  user_id: string;
  user_email?: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// REPORTS & ANALYTICS
// ============================================

export interface RevenueMetrics {
  adr: number;
  revpar: number;
  occupancy_rate: number;
  total_revenue: number;
  revenue_breakdown: {
    accommodation: number;
    f_and_b: number;
    activities: number;
    others: number;
  };
}

export interface HospitalityDailyMetrics {
  date: string;
  adr: number;
  revpar: number;
  occupancy_rate: number;
  total_rooms: number;
  occupied_rooms: number;
}

export interface HousekeepingPrediction {
  date: string;
  departures: number;
  arrivals: number;
  stay_overs: number;
  estimated_minutes: number;
}

// ============================================
// AUDIT LOGS
// ============================================

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  payload?: unknown;
  metadata?: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// ACTIVITY SCHEDULES
// ============================================

export interface ActivitySchedule {
  id: string;
  activity_id: string;
  guide_id?: string;
  guide_name?: string;
  vehicle_id?: string;
  start_time: string;
  end_time?: string;
  max_guests?: number;
  available_spots?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

// ============================================
// GUEST FEEDBACK
// ============================================

export interface GuestFeedback {
  id: string;
  guest_id: string;
  guest_name?: string;
  rating: number;
  comment?: string;
  reservation_id?: string;
  order_id?: string;
  reply?: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// WEBHOOK LOGS
// ============================================

export interface WebhookLog {
  id: string;
  event: string;
  url: string;
  payload?: unknown;
  response_status?: number;
  success: boolean;
  retry_count: number;
  error_message?: string;
  created_at: string;
}

// ============================================
// TAX CONFIGURATION
// ============================================

export interface TaxConfiguration {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
  is_compulsory: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// TRANSPORTATION
// ============================================

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  type: "4x4" | "sedan" | "van" | "bus" | "other";
  capacity: number;
  status: "available" | "in_use" | "maintenance" | "retired";
  last_maintenance?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  profile_id?: string;
  full_name?: string;
  email?: string;
  license_number: string;
  license_expiry: string;
  phone: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  guest_id?: string;
  guest_name: string;
  guest_count: number;
  driver_id?: string;
  driver_name?: string;
  vehicle_id?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  license_plate?: string;
  transfer_type: "pickup" | "dropoff" | "roundtrip" | "excursion";
  pickup_location: string;
  dropoff_location: string;
  pickup_datetime: string;
  dropoff_datetime?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  price: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}
