/**
 * Public Routes
 * No authentication required. Handles marketplace browsing, listing profiles,
 * the booking flow, and all auth pages.
 */

import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";

// Marketplace public pages
const MarketplaceHomePage = lazy(() => import("@/pages/marketplace/MarketplaceHomePage"));
const SearchResultsPage = lazy(() => import("@/pages/marketplace/SearchResultsPage"));
const ListingProfilePage = lazy(() => import("@/pages/marketplace/ListingProfilePage"));
const BookingPage = lazy(() => import("@/pages/public/BookingPage"));

// Auth pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignupPage = lazy(() => import("@/pages/auth/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));

// Legacy public pages (kept for backward compatibility with single-listing deployments)
const PublicRoomsPage = lazy(() => import("@/pages/public/PublicRoomsPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const GalleryPage = lazy(() => import("@/pages/public/GalleryPage"));
const ExcursionsPage = lazy(() => import("@/pages/public/ExcursionsPage"));
const MenuPage = lazy(() => import("@/pages/public/MenuPage"));
const BlogPage = lazy(() => import("@/pages/public/BlogPage"));
const AvailabilityPage = lazy(() => import("@/pages/public/AvailabilityPage"));
const PublicFolioPage = lazy(() => import("@/pages/public/PublicFolioPage"));
const MarketplacePage = lazy(() => import("@/pages/public/MarketplacePage"));

/**
 * Returns all public route elements to be rendered inside a <Routes> tree.
 * Must be wrapped by a parent <Routes> in App.tsx.
 */
export function PublicRoutes() {
  return (
    <Route element={<PublicLayout />}>
      {/* ── Marketplace pages ───────────────────────────────── */}
      <Route path="/" element={<MarketplaceHomePage />} />
      <Route path="/search" element={<SearchResultsPage />} />
      <Route path="/listing/:slug" element={<ListingProfilePage />} />
      <Route path="/listing/:slug/booking" element={<BookingPage />} />

      {/* ── Auth pages ──────────────────────────────────────── */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />

      {/* ── Backward compat auth aliases ────────────────────── */}
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
      <Route
        path="/reset-password"
        element={<Navigate to="/auth/reset-password/invalid" replace />}
      />

      {/* ── Legacy single-listing public pages ──────────────── */}
      <Route path="/rooms" element={<PublicRoomsPage />} />
      <Route path="/accommodations" element={<PublicRoomsPage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/book" element={<BookingPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
      <Route path="/photos" element={<GalleryPage />} />
      <Route path="/excursions" element={<ExcursionsPage />} />
      <Route path="/activities" element={<ExcursionsPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/dining" element={<MenuPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/news" element={<BlogPage />} />
      <Route path="/availability" element={<AvailabilityPage />} />
      <Route path="/folio" element={<PublicFolioPage />} />
      <Route path="/about" element={<PublicFolioPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
    </Route>
  );
}
