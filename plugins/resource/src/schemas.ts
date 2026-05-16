import { z } from 'zod';

// ── Public listing search params ────────────────────────────────────────────
export const ListingSearchSchema = z.object({
  search: z.string().optional(),
  location: z.string().optional(),
  tier: z.enum(['basic', 'premium', 'elite']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListingSearch = z.infer<typeof ListingSearchSchema>;

// ── Master create listing body ──────────────────────────────────────────────
export const CreateListingSchema = z.object({
  tenant_id: z.string().min(1, 'tenant_id is required'),
  title: z.string().min(1, 'title is required'),
  slug: z
    .string()
    .min(1, 'slug is required')
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  location: z.string().optional(),
  tier: z.enum(['basic', 'premium', 'elite']).default('basic'),
  images: z.array(z.string().url()).optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateListing = z.infer<typeof CreateListingSchema>;

// ── Master update listing body (all fields optional) ───────────────────────
export const MasterUpdateListingSchema = z.object({
  tenant_id: z.string().optional(),
  title: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  tier: z.enum(['basic', 'premium', 'elite']).optional(),
  images: z.array(z.string().url()).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MasterUpdateListing = z.infer<typeof MasterUpdateListingSchema>;

// ── Admin update listing (limited fields, no tenant/slug changes) ──────────
export const AdminUpdateListingSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  tier: z.enum(['basic', 'premium', 'elite']).optional(),
  images: z.array(z.string().url()).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AdminUpdateListing = z.infer<typeof AdminUpdateListingSchema>;

// ── Property Registration ──────────────────────────────────────────────────
export const RegisterPropertySchema = z.object({
  title: z.string().min(1, 'Property name is required'),
  email: z.string().email('Valid email is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  tier: z.enum(['basic', 'premium', 'ultimate']).default('basic'),
  customDomain: z.string().optional(),
});

export type RegisterProperty = z.infer<typeof RegisterPropertySchema>;
