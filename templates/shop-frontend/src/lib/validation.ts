/**
 * Zod validation schemas for forms
 */

import { z } from "zod";

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Reset password form schema
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(50, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Signup form schema
 */
export const signupSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Name is too long"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(50, "Password is too long"),
});

export type SignupFormData = z.infer<typeof signupSchema>;

/**
 * Guest profile update schema
 */
export const guestProfileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Name is too long"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  language: z.string().default("en").nullable(),
  dietary_preferences: z
    .preprocess((val) => {
      if (!val) return [];
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return [];
        }
      }
      return val;
    }, z.array(z.string()))
    .default([]),
  bio: z.string().max(500, "Bio is too long").optional().nullable(),
  marketing_emails: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  preferred_theme: z.enum(["light", "dark", "system"]).default("light"),
});

export type GuestProfileFormData = z.infer<typeof guestProfileSchema>;

/**
 * Staff profile update schema
 */
export const staffProfileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  bio: z.string().max(500, "Bio is too long").optional().nullable(),
});

export type StaffProfileFormData = z.infer<typeof staffProfileSchema>;

/**
 * Public booking form schema (multi-step wizard)
 */
export const bookingSchema = z.object({
  // Step 1: Dates & Room
  checkIn: z.string().min(1, "Check-in date is required"),
  checkOut: z.string().min(1, "Check-out date is required"),
  roomId: z.string().optional(),
  roomType: z.string().optional(),
  // Step 2: Guest details
  guestName: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  guestCount: z.number().min(1).default(1),
  notes: z.string().max(500).optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

/**
 * Reservation creation schema
 */
export const reservationSchema = z.object({
  guest_name: z.string().min(1, "Guest name is required"),
  guest_id: z.string().optional(),
  room_id: z.string().optional(),
  type: z.enum(["stay", "day_use", "event"]).default("stay"),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guest_count: z.number().min(1).default(1),
  notes: z.string().optional(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;

/**
 * Order creation schema
 */
export const orderSchema = z.object({
  guest_id: z.string().optional(),
  room_id: z.string().optional(),
  table_id: z.string().optional(),
  type: z.enum(["dine_in", "room_service", "takeaway"]),
  notes: z.string().optional(),
});

export type OrderFormData = z.infer<typeof orderSchema>;

/**
 * Payment schema
 */
export const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["cash", "card", "mpesa", "bank_transfer", "points", "paypal"]),
  reference: z.string().optional(),
  points_redeemed: z.number().min(0).optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

/**
 * Page builder block schema
 */
export const pageBlockSchema = z.object({
  id: z.string(),
  type: z.enum([
    "heading",
    "text",
    "image",
    "gallery",
    "button",
    "video",
    "embed",
    "bookingForm",
    "contactForm",
  ]),
  content: z.record(z.unknown()),
  styles: z.record(z.string()).optional(),
  settings: z
    .object({
      fullWidth: z.boolean().optional(),
      padding: z.string().optional(),
      backgroundColor: z.string().optional(),
    })
    .optional(),
});

export type PageBlockFormData = z.infer<typeof pageBlockSchema>;

/**
 * Page creation schema
 */
export const pageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .max(100, "Slug is too long")
    .optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  content: z.array(pageBlockSchema).default([]),
  seo: z
    .object({
      metaTitle: z.string().max(70).optional(),
      metaDescription: z.string().max(160).optional(),
      keywords: z.array(z.string()).optional(),
      ogImage: z.string().url().optional().or(z.literal("")),
      noIndex: z.boolean().optional(),
    })
    .default({}),
});

export type PageFormData = z.infer<typeof pageSchema>;
