/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/lib/validation.ts
 * Tests all Zod validation schemas
 */

import { describe, it, expect } from "vitest";
import {
  loginSchema,
  type LoginFormData,
  resetPasswordSchema,
  type ResetPasswordFormData,
  signupSchema,
  type SignupFormData,
  guestProfileSchema,
  type GuestProfileFormData,
  staffProfileSchema,
  type StaffProfileFormData,
  bookingSchema,
  type BookingFormData,
  reservationSchema,
  type ReservationFormData,
  orderSchema,
  type OrderFormData,
  paymentSchema,
  type PaymentFormData,
  pageBlockSchema,
  type PageBlockFormData,
  pageSchema,
  type PageFormData,
} from "../validation";

describe("loginSchema", () => {
  it("validates correct login data", () => {
    const data: LoginFormData = {
      email: "user@example.com",
      password: "password123",
    };
    expect(() => loginSchema.parse(data)).not.toThrow();
  });

  it("requires email", () => {
    const data = { email: "", password: "password123" };
    expect(() => loginSchema.parse(data)).toThrow("Email is required");
  });

  it("requires valid email format", () => {
    const data = { email: "not-an-email", password: "password123" };
    expect(() => loginSchema.parse(data)).toThrow("Invalid email format");
  });

  it("requires password", () => {
    const data = { email: "user@example.com", password: "" };
    expect(() => loginSchema.parse(data)).toThrow("Password is required");
  });

  it("requires password of at least 6 characters", () => {
    const data = { email: "user@example.com", password: "123" };
    expect(() => loginSchema.parse(data)).toThrow("Password must be at least 6 characters");
  });
});

describe("resetPasswordSchema", () => {
  it("validates matching passwords", () => {
    const data: ResetPasswordFormData = {
      password: "newpassword123",
      confirmPassword: "newpassword123",
    };
    expect(() => resetPasswordSchema.parse(data)).not.toThrow();
  });

  it("rejects non-matching passwords", () => {
    const data = {
      password: "newpassword123",
      confirmPassword: "differentpassword",
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow("Passwords do not match");
  });

  it("requires password of at least 6 characters", () => {
    const data = {
      password: "123",
      confirmPassword: "123",
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow("Password must be at least 6 characters");
  });

  it("rejects password that is too long", () => {
    const data = {
      password: "a".repeat(51),
      confirmPassword: "a".repeat(51),
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow("Password is too long");
  });
});

describe("signupSchema", () => {
  it("validates correct signup data", () => {
    const data: SignupFormData = {
      full_name: "John Doe",
      email: "john@example.com",
      password: "password123",
    };
    expect(() => signupSchema.parse(data)).not.toThrow();
  });

  it("validates with optional phone", () => {
    const data: SignupFormData = {
      full_name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      password: "password123",
    };
    expect(() => signupSchema.parse(data)).not.toThrow();
  });

  it("requires full name", () => {
    const data = {
      full_name: "",
      email: "john@example.com",
      password: "password123",
    };
    expect(() => signupSchema.parse(data)).toThrow("Full name is required");
  });

  it("rejects full name that is too long", () => {
    const data = {
      full_name: "a".repeat(101),
      email: "john@example.com",
      password: "password123",
    };
    expect(() => signupSchema.parse(data)).toThrow("Name is too long");
  });

  it("requires email", () => {
    const data = {
      full_name: "John Doe",
      email: "",
      password: "password123",
    };
    expect(() => signupSchema.parse(data)).toThrow("Email is required");
  });

  it("requires valid email", () => {
    const data = {
      full_name: "John Doe",
      email: "not-an-email",
      password: "password123",
    };
    expect(() => signupSchema.parse(data)).toThrow("Invalid email format");
  });

  it("requires password", () => {
    const data = {
      full_name: "John Doe",
      email: "john@example.com",
      password: "",
    };
    expect(() => signupSchema.parse(data)).toThrow("Password is required");
  });
});

describe("guestProfileSchema", () => {
  it("validates minimal profile", () => {
    const data = { full_name: "John Doe" };
    expect(() => guestProfileSchema.parse(data)).not.toThrow();
  });

  it("validates complete profile", () => {
    const data: GuestProfileFormData = {
      full_name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      nationality: "US",
      language: "en",
      dietary_preferences: ["vegan", "gluten-free"],
      bio: "A short bio",
      marketing_emails: false,
      push_notifications: false,
      preferred_theme: "dark",
    };
    expect(() => guestProfileSchema.parse(data)).not.toThrow();
  });

  it("allows empty email string", () => {
    const data = {
      full_name: "John Doe",
      email: "",
    };
    expect(() => guestProfileSchema.parse(data)).not.toThrow();
  });

  it("allows null email", () => {
    const data = {
      full_name: "John Doe",
      email: null,
    };
    expect(() => guestProfileSchema.parse(data)).not.toThrow();
  });

  it("allows null phone", () => {
    const data = {
      full_name: "John Doe",
      phone: null,
    };
    expect(() => guestProfileSchema.parse(data)).not.toThrow();
  });

  it("parses dietary_preferences from JSON string", () => {
    const data = {
      full_name: "John Doe",
      dietary_preferences: '["vegan", "nut-free"]',
    };
    const result = guestProfileSchema.parse(data);
    expect(result.dietary_preferences).toEqual(["vegan", "nut-free"]);
  });

  it("defaults dietary_preferences to empty array for invalid JSON", () => {
    const data = {
      full_name: "John Doe",
      dietary_preferences: "invalid json",
    };
    const result = guestProfileSchema.parse(data);
    expect(result.dietary_preferences).toEqual([]);
  });

  it("defaults dietary_preferences to empty array when null", () => {
    const data = {
      full_name: "John Doe",
      dietary_preferences: null,
    };
    const result = guestProfileSchema.parse(data);
    expect(result.dietary_preferences).toEqual([]);
  });

  it("rejects bio that is too long", () => {
    const data = {
      full_name: "John Doe",
      bio: "a".repeat(501),
    };
    expect(() => guestProfileSchema.parse(data)).toThrow("Bio is too long");
  });

  it("defaults marketing_emails to true", () => {
    const data = { full_name: "John Doe" };
    const result = guestProfileSchema.parse(data) as GuestProfileFormData;
    expect(result.marketing_emails).toBe(true);
  });

  it("defaults push_notifications to true", () => {
    const data = { full_name: "John Doe" };
    const result = guestProfileSchema.parse(data) as GuestProfileFormData;
    expect(result.push_notifications).toBe(true);
  });

  it("defaults preferred_theme to light", () => {
    const data = { full_name: "John Doe" };
    const result = guestProfileSchema.parse(data) as GuestProfileFormData;
    expect(result.preferred_theme).toBe("light");
  });

  it("accepts dark theme", () => {
    const data = { full_name: "John Doe", preferred_theme: "dark" };
    const result = guestProfileSchema.parse(data) as GuestProfileFormData;
    expect(result.preferred_theme).toBe("dark");
  });

  it("accepts system theme", () => {
    const data = { full_name: "John Doe", preferred_theme: "system" };
    const result = guestProfileSchema.parse(data) as GuestProfileFormData;
    expect(result.preferred_theme).toBe("system");
  });

  it("defaults language to en", () => {
    const data = { full_name: "John Doe" };
    const result = guestProfileSchema.parse(data) as GuestProfileFormData;
    expect(result.language).toBe("en");
  });
});

describe("staffProfileSchema", () => {
  it("validates minimal staff profile", () => {
    const data: StaffProfileFormData = {
      full_name: "Staff Member",
    };
    expect(() => staffProfileSchema.parse(data)).not.toThrow();
  });

  it("validates complete staff profile", () => {
    const data: StaffProfileFormData = {
      full_name: "Staff Member",
      bio: "Staff bio text",
    };
    expect(() => staffProfileSchema.parse(data)).not.toThrow();
  });

  it("requires name", () => {
    const data = { full_name: "" };
    expect(() => staffProfileSchema.parse(data)).toThrow("Name is required");
  });

  it("rejects name that is too long", () => {
    const data = { full_name: "a".repeat(101) };
    expect(() => staffProfileSchema.parse(data)).toThrow("Name is too long");
  });

  it("allows null bio", () => {
    const data = { full_name: "Staff Member", bio: null };
    expect(() => staffProfileSchema.parse(data)).not.toThrow();
  });

  it("allows optional bio", () => {
    const data = { full_name: "Staff Member" };
    const result = staffProfileSchema.parse(data);
    expect(result.bio).toBeUndefined();
  });
});

describe("bookingSchema", () => {
  it("validates minimal booking", () => {
    const data = {
      checkIn: "2024-01-15",
      checkOut: "2024-01-20",
      guestName: "John Doe",
      email: "john@example.com",
    };
    expect(() => bookingSchema.parse(data)).not.toThrow();
  });

  it("validates complete booking", () => {
    const data = {
      checkIn: "2024-01-15",
      checkOut: "2024-01-20",
      roomId: "room-123",
      roomType: "deluxe",
      guestName: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      guestCount: 2,
      notes: "Special requests",
    };
    expect(() => bookingSchema.parse(data)).not.toThrow();
  });

  it("requires check-in date", () => {
    const data = {
      checkIn: "",
      checkOut: "2024-01-20",
      guestName: "John Doe",
      email: "john@example.com",
    };
    expect(() => bookingSchema.parse(data)).toThrow("Check-in date is required");
  });

  it("requires check-out date", () => {
    const data = {
      checkIn: "2024-01-15",
      checkOut: "",
      guestName: "John Doe",
      email: "john@example.com",
    };
    expect(() => bookingSchema.parse(data)).toThrow("Check-out date is required");
  });

  it("requires guest name", () => {
    const data = {
      checkIn: "2024-01-15",
      checkOut: "2024-01-20",
      guestName: "",
      email: "john@example.com",
    };
    expect(() => bookingSchema.parse(data)).toThrow("Name is required");
  });

  it("requires valid email", () => {
    const data = {
      checkIn: "2024-01-15",
      checkOut: "2024-01-20",
      guestName: "John Doe",
      email: "not-an-email",
    };
    expect(() => bookingSchema.parse(data)).toThrow("Please enter a valid email");
  });

  it("defaults guestCount to 1", () => {
    const data = {
      checkIn: "2024-01-15",
      checkOut: "2024-01-20",
      guestName: "John Doe",
      email: "john@example.com",
    };
    const result = bookingSchema.parse(data) as BookingFormData;
    expect(result.guestCount).toBe(1);
  });

  it("requires minimum guest count of 1", () => {
    const data = {
      checkIn: "2024-01-15",
      checkOut: "2024-01-20",
      guestName: "John Doe",
      email: "john@example.com",
      guestCount: 0,
    };
    expect(() => bookingSchema.parse(data)).toThrow("Number must be greater than or equal to 1");
  });
});

describe("reservationSchema", () => {
  it("validates minimal reservation", () => {
    const data = { guest_name: "John Doe" };
    expect(() => reservationSchema.parse(data)).not.toThrow();
  });

  it("validates complete reservation", () => {
    const data = {
      guest_name: "John Doe",
      guest_id: "guest-123",
      room_id: "room-456",
      type: "day_use",
      check_in: "2024-01-15T10:00:00Z",
      check_out: "2024-01-15T18:00:00Z",
      guest_count: 3,
      notes: "Special occasion",
    };
    expect(() => reservationSchema.parse(data)).not.toThrow();
  });

  it("requires guest name", () => {
    const data = { guest_name: "" };
    expect(() => reservationSchema.parse(data)).toThrow("Guest name is required");
  });

  it("defaults type to stay", () => {
    const data = { guest_name: "John Doe" };
    const result = reservationSchema.parse(data) as ReservationFormData;
    expect(result.type).toBe("stay");
  });

  it("accepts day_use type", () => {
    const data = { guest_name: "John Doe", type: "day_use" };
    const result = reservationSchema.parse(data) as ReservationFormData;
    expect(result.type).toBe("day_use");
  });

  it("accepts event type", () => {
    const data = { guest_name: "John Doe", type: "event" };
    const result = reservationSchema.parse(data) as ReservationFormData;
    expect(result.type).toBe("event");
  });

  it("defaults guest_count to 1", () => {
    const data = { guest_name: "John Doe" };
    const result = reservationSchema.parse(data) as ReservationFormData;
    expect(result.guest_count).toBe(1);
  });
});

describe("orderSchema", () => {
  it("validates minimal order", () => {
    const data: OrderFormData = {
      type: "dine_in",
    };
    expect(() => orderSchema.parse(data)).not.toThrow();
  });

  it("validates complete order", () => {
    const data: OrderFormData = {
      guest_id: "guest-123",
      room_id: "room-456",
      table_id: "table-789",
      type: "room_service",
      notes: "Extra napkins please",
    };
    expect(() => orderSchema.parse(data)).not.toThrow();
  });

  it("accepts dine_in type", () => {
    const data = { type: "dine_in" };
    const result = orderSchema.parse(data);
    expect(result.type).toBe("dine_in");
  });

  it("accepts room_service type", () => {
    const data = { type: "room_service" };
    const result = orderSchema.parse(data);
    expect(result.type).toBe("room_service");
  });

  it("accepts takeaway type", () => {
    const data = { type: "takeaway" };
    const result = orderSchema.parse(data);
    expect(result.type).toBe("takeaway");
  });
});

describe("paymentSchema", () => {
  it("validates minimal payment", () => {
    const data: PaymentFormData = {
      amount: 100,
      method: "cash",
    };
    expect(() => paymentSchema.parse(data)).not.toThrow();
  });

  it("validates complete payment", () => {
    const data: PaymentFormData = {
      amount: 250.5,
      method: "card",
      reference: "REF-12345",
      points_redeemed: 100,
    };
    expect(() => paymentSchema.parse(data)).not.toThrow();
  });

  it("requires positive amount", () => {
    const data = {
      amount: 0,
      method: "cash",
    };
    expect(() => paymentSchema.parse(data)).toThrow("Amount must be positive");
  });

  it("rejects negative amount", () => {
    const data = {
      amount: -50,
      method: "cash",
    };
    expect(() => paymentSchema.parse(data)).toThrow("Amount must be positive");
  });

  it("accepts all payment methods", () => {
    const methods = ["cash", "card", "mpesa", "bank_transfer", "points", "paypal"];
    methods.forEach((method) => {
      const data = { amount: 100, method };
      expect(() => paymentSchema.parse(data)).not.toThrow();
    });
  });

  it("requires points_redeemed to be non-negative", () => {
    const data = {
      amount: 100,
      method: "points",
      points_redeemed: -10,
    };
    expect(() => paymentSchema.parse(data)).toThrow("Number must be greater than or equal to 0");
  });
});

describe("pageBlockSchema", () => {
  it("validates minimal page block", () => {
    const data: PageBlockFormData = {
      id: "block-1",
      type: "heading",
      content: { text: "Hello" },
    };
    expect(() => pageBlockSchema.parse(data)).not.toThrow();
  });

  it("validates complete page block", () => {
    const data: PageBlockFormData = {
      id: "block-1",
      type: "image",
      content: { src: "image.jpg", alt: "Description" },
      styles: { width: "100%", height: "auto" },
      settings: {
        fullWidth: true,
        padding: "20px",
        backgroundColor: "#ffffff",
      },
    };
    expect(() => pageBlockSchema.parse(data)).not.toThrow();
  });

  it("accepts all block types", () => {
    const types = [
      "heading",
      "text",
      "image",
      "gallery",
      "button",
      "video",
      "embed",
      "bookingForm",
      "contactForm",
    ];
    types.forEach((type) => {
      const data = { id: "block-1", type, content: {} };
      expect(() => pageBlockSchema.parse(data)).not.toThrow();
    });
  });

  it("allows optional styles", () => {
    const data = {
      id: "block-1",
      type: "text",
      content: { text: "Hello" },
    };
    const result = pageBlockSchema.parse(data);
    expect(result.styles).toBeUndefined();
  });

  it("allows optional settings", () => {
    const data = {
      id: "block-1",
      type: "text",
      content: { text: "Hello" },
    };
    const result = pageBlockSchema.parse(data);
    expect(result.settings).toBeUndefined();
  });
});

describe("pageSchema", () => {
  it("validates minimal page", () => {
    const data = { title: "My Page" };
    expect(() => pageSchema.parse(data)).not.toThrow();
  });

  it("validates complete page", () => {
    const data = {
      title: "My Page",
      slug: "my-page",
      status: "published",
      content: [
        {
          id: "block-1",
          type: "heading",
          content: { text: "Welcome" },
        },
      ],
      seo: {
        metaTitle: "My Page Title",
        metaDescription: "Page description",
        keywords: ["keyword1", "keyword2"],
        ogImage: "https://example.com/image.jpg",
        noIndex: false,
      },
    };
    expect(() => pageSchema.parse(data)).not.toThrow();
  });

  it("requires title", () => {
    const data = { title: "" };
    expect(() => pageSchema.parse(data)).toThrow("Title is required");
  });

  it("rejects title that is too long", () => {
    const data = { title: "a".repeat(201) };
    expect(() => pageSchema.parse(data)).toThrow("Title is too long");
  });

  it("accepts valid slug", () => {
    const data = { title: "My Page", slug: "my-page-123" };
    expect(() => pageSchema.parse(data)).not.toThrow();
  });

  it("rejects invalid slug characters", () => {
    const data = { title: "My Page", slug: "my page" };
    expect(() => pageSchema.parse(data)).toThrow(
      "Slug can only contain lowercase letters, numbers, and hyphens"
    );
  });

  it("rejects slug with uppercase letters", () => {
    const data = { title: "My Page", slug: "My-Page" };
    expect(() => pageSchema.parse(data)).toThrow(
      "Slug can only contain lowercase letters, numbers, and hyphens"
    );
  });

  it("rejects slug with underscores", () => {
    const data = { title: "My Page", slug: "my_page" };
    expect(() => pageSchema.parse(data)).toThrow(
      "Slug can only contain lowercase letters, numbers, and hyphens"
    );
  });

  it("defaults status to draft", () => {
    const data = { title: "My Page" };
    const result = pageSchema.parse(data) as PageFormData;
    expect(result.status).toBe("draft");
  });

  it("accepts published status", () => {
    const data = { title: "My Page", status: "published" };
    const result = pageSchema.parse(data) as PageFormData;
    expect(result.status).toBe("published");
  });

  it("defaults content to empty array", () => {
    const data = { title: "My Page" };
    const result = pageSchema.parse(data) as PageFormData;
    expect(result.content).toEqual([]);
  });

  it("defaults seo to empty object", () => {
    const data = { title: "My Page" };
    const result = pageSchema.parse(data) as PageFormData;
    expect(result.seo).toEqual({});
  });
});
