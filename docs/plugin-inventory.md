# SinaiCamps Marketplace Plugin Inventory

This document provides a comprehensive overview of all plugins currently implemented in the `plugins/` directory.

## 1. Booking Plugin (`plugins/booking`)

- **Purpose**: Core business capability for managing property reservations.
- **Implementation Status**: Fully functional.
- **Database Tables**:
  - `plugin_booking_reservations` (Created dynamically via `api.db.createTable`).
- **UI Components**:
  - `listing.sidebar`: `BookingWidget`
  - `dashboard.top`: `BookingStats`
  - Settings Page: `Bookings` (ID: `booking-admin`).
- **Hooks**:
  - Fires: `booking_created`, `booking_confirmed`.
  - Listens to: N/A.
- **Dependencies**: Standalone.
- **Testing Coverage**: Unit and Integration tests exist. Coverage > 90%.

## 2. CRM Plugin (`plugins/crm`)

- **Purpose**: Customer relationship management, tracking guest interactions and history.
- **Implementation Status**: Fully functional.
- **Database Tables**:
  - `plugin_crm_activities`
- **UI Components**:
  - `listing.sidebar`: `ActivityWidget`
- **Hooks**:
  - Listens to: `booking_created` (to log activity).
- **Dependencies**: Standalone.
- **Testing Coverage**: Unit tests verify hook listeners and activity logging.

## 3. Loyalty Program (`plugins/loyalty`)

- **Purpose**: Guest retention via points and rewards.
- **Implementation Status**: Fully functional.
- **Database Tables**:
  - `plugin_loyalty_points`
  - `plugin_loyalty_settings`
- **UI Components**:
  - `listing.footer`: `LoyaltyBanner`
  - `checkout.summary`: `PointsRedemption`
- **Hooks**:
  - Listens to: `payment_success` (to award points), `checkout_initiated` (to apply discounts).
- **Dependencies**: Standalone.
- **Testing Coverage**: Comprehensive integration tests for point calculation and hook integration.

## 5. PWA Plugin (`plugins/pwa`)

- **Purpose**: Progressive Web App capabilities, including push notifications and offline access.
- **Implementation Status**: Reference Implementation (Core UI and tables ready, full push logic is a stub).
- **Database Tables**:
  - `plugin_pwa_settings`
  - `plugin_pwa_subscriptions`
- **UI Components**:
  - `listing.header`: `PWAInstallBanner`
  - `dashboard.top`: `PWAInstallBanner`
  - Settings Page: `PWA Settings` (ID: `pwa-settings`).
- **Hooks**:
  - Listens to: `listing.public_page_loaded`.
- **Dependencies**: Standalone.
- **Testing Coverage**: Integration tests verify table creation and UI registration.

## 6. Listing Admin Plugin (`plugins/listing-admin`)

- **Purpose**: Property-level dashboard for stats (revenue, fees).
- **Implementation Status**: Fully functional (Reference implementation for Stateless Dashboards).
- **Database Tables**: N/A (Directly queries core `reservations` via `api.db`).
- **UI Components**:
  - `admin.dashboard`: `StatsWidget`
- **Hooks**:
  - Listens to: `dashboard.get_stats`.
- **Dependencies**: Standalone.
- **Testing Coverage**: Unit tests verify stats aggregation logic.

---

## Architectural Note

The **Listing Admin** plugin demonstrates the power of the "Stateless Dashboard" pattern. While its primary metrics are also integrated into the marketplace core for performance, the plugin version serves as a template for developers building third-party analytics extensions.
