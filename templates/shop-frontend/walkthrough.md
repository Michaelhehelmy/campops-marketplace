# SinaiCamps PWA & Responsive Editor Implementation

This document summarizes the implementation of Phase 1-3: Responsive Layout, PWA Installation, and Offline Data Sync for the Canvas Page Editor.

## Phase 1: Complete Responsive Layout

### 1. Sidebar & Layout

- **File**: `src/components/layout/Sidebar.tsx`
- **File**: `src/components/layout/AppLayout.tsx`
- The admin sidebar is already a toggleable overlay drawer on mobile (< 768px)
- Hamburger button visible in top-left corner on mobile
- Backdrop closes drawer when tapped
- Uses Tailwind breakpoints (`md:hidden`, `md:static`, `translate-x-full`)

### 2. Editor Toolbar

- **File**: `src/pages/admin/page-editor/EditorToolbar.tsx`
- Buttons wrap and resize gracefully with responsive classes
- All buttons have minimum touch target of 48×48px (`min-h-[48px] min-w-[48px]`)
- Device toggle buttons, zoom controls, and action buttons all meet accessibility standards
- Overflow menu (dropdown) for secondary actions via `MoreVertical` button

### 3. Side Panels (BlockPalette & PropertiesPanel)

- **File**: `src/pages/admin/PageEditorPage.tsx`
- Desktop: Fixed sidebars visible at `md:block`
- Mobile (<768px): Slide-out drawers via Sheet component
- BlockPalette accessible via floating action button (Plus icon)
- PropertiesPanel accessible via floating action button (Settings icon)
- Backdrop automatically closes drawers when tapped (built into Sheet)

### 4. Canvas & Touch

- **File**: `src/pages/admin/page-editor/EditorCanvas.tsx`
- Touch-based pan implemented (one finger drag)
- Pinch-to-zoom implemented (two finger gesture)
- Virtual scroller (react-window) recalculates on viewport changes
- Alt-drag emulation for panning on desktop

### 5. Verification

- **File**: `e2e/responsive-editor.spec.ts`
- Playwright tests verify responsive layout at:
  - 375px (mobile): Hamburger menu, FABs, overflow menu
  - 768px (tablet): Static sidebar, hidden FABs
  - 1200px (desktop): Full toolbar buttons visible

## Phase 2: PWA Installation & Update Experience

### 1. Manifest

- **Generated via**: `vite.config.ts` (VitePWA plugin)
- Configuration includes:
  - `name: "SinaiCamps"`
  - `short_name: "SinaiCamps"`
  - `start_url: "/"`
  - `display: "standalone"`
  - `theme_color: "#0f172a"`
  - `background_color: "#ffffff"`
  - Icons: `pwa-192x192.png`, `pwa-512x512.png`
  - Screenshots for desktop and mobile

### 2. Service Worker (vite-plugin-pwa)

- **File**: `vite.config.ts`
- `registerType: 'autoUpdate'` configured
- Workbox precaching for app shell
- Runtime caching rules:
  - Static assets (images, fonts): Cache First
  - API GET requests (`/api/*`): Network First with 5s timeout
  - POST/PUT/DELETE: Not cached (handled by sync queue)

### 3. Install Prompt Modal

- **File**: `src/components/PWAModal.tsx`
- **Hook**: `src/hooks/usePWA.ts`
- Captures `beforeinstallprompt` event
- Shows modal with 3-second delay for better UX
- LocalStorage `pwa_install_snoozed` stores dismissal for 7 days
- "Install" button calls deferred `prompt()`
- "Not now" dismisses and sets snooze

### 4. Update Notification

- **File**: `src/components/PWAModal.tsx` (PWAUpdateModal)
- Uses service worker registration to detect waiting SW
- Shows non-intrusive toast: "Update available"
- "Update now" button calls `SKIP_WAITING` message
- Auto-reloads on controller change

### 5. Test

- **File**: `e2e/pwa-install.spec.ts`
- Mocks `beforeinstallprompt` event
- Verifies install banner appears
- Tests dismiss functionality
- Tests update banner scenarios

## Phase 3: Offline Data Sync

### 1. Offline Detection

- **Hook**: `src/hooks/usePWA.ts` (useOfflineBanner)
- Returns `isOffline`, `showBanner`, `dismissBanner`
- Displays banner: "You are offline. Changes will sync when connection resumes."
- Shows pending count badge

### 2. Local Persistence

- **File**: `src/lib/localPageStore.ts`
- Uses `idb` (IndexedDB wrapper)
- `pageDrafts` store with schema:
  - id, title, slug, status, blocks, seo, updatedAt, syncStatus
- Debounced auto-save (1 second) from Zustand store subscription
- Load from IndexedDB when offline on mount

### 3. Sync Queue

- **File**: `src/lib/pageSyncQueue.ts`
- Separate store for pending operations
- Operation types: `save`, `publish`
- Schema: id, type, pageId, data, timestamp, retryCount, error
- Auto-sync on `online` event
- Conflict detection (409 status)
- Max 3 retries with exponential backoff

### 4. Conflict Handling

- **File**: `src/components/ConflictResolutionModal.tsx`
- Shows modal on 409 Conflict response
- Options:
  - "Reload from Server": Discards local, reloads page
  - "Keep My Version": Re-queues for sync
- Integrated into `src/pages/admin/PageEditorPage.tsx`

### 5. Integration

- **File**: `src/hooks/usePageSync.ts`
- Combines localPageStore, pageSyncQueue, and online detection
- Auto-subscribes to canvas store changes
- Handles save with sync fallback
- Manages conflict state

### 6. Testing

- **File**: `e2e/offline-page-sync.spec.ts`
- Tests local save while offline
- Tests sync when coming back online
- Tests conflict modal on 409 error
- Tests offline banner visibility

## Files Created/Modified

### New Files:

1. `src/lib/localPageStore.ts` - IndexedDB page draft storage
2. `src/lib/pageSyncQueue.ts` - Offline operation queue
3. `src/hooks/usePageSync.ts` - Page sync hook
4. `src/components/ConflictResolutionModal.tsx` - Conflict UI
5. `e2e/pwa-install.spec.ts` - PWA install tests
6. `e2e/offline-page-sync.spec.ts` - Offline sync tests

### Modified Files:

1. `src/pages/admin/page-editor/EditorToolbar.tsx` - 48px touch targets
2. `src/pages/admin/PageEditorPage.tsx` - Offline sync integration

## Existing Infrastructure Used:

- `src/components/PWAModal.tsx` - Install/Update modals
- `src/components/OfflineBanner.tsx` - Offline status banner
- `src/hooks/usePWA.ts` - PWA status hook
- `src/lib/offlineQueue.ts` - Generic offline queue
- `vite.config.ts` - PWA configuration
- `e2e/responsive-editor.spec.ts` - Responsive tests

## How to Test:

### Run Responsive Tests:

```bash
cd frontend
npx playwright test responsive-editor.spec.ts
```

### Run PWA Tests:

```bash
npx playwright test pwa-install.spec.ts
```

### Run Offline Sync Tests:

```bash
npx playwright test offline-page-sync.spec.ts
```

### Run All Tests:

```bash
npm run test:ci
```

## Build for Production:

```bash
npm run build
```

The PWA manifest and service worker are generated automatically by `vite-plugin-pwa` during build.
