import { expect, afterEach, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

// @ts-ignore
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Polyfill MessageChannel for React Query and other async tools
if (typeof MessageChannel === "undefined") {
  const { MessageChannel: PolyfillChannel } = require("worker_threads");
  if (PolyfillChannel) {
    (global as any).MessageChannel = PolyfillChannel;
  }
}

// JSDOM specific mocks - only run if window is defined
if (typeof window !== "undefined") {
  // Polyfill IntersectionObserver
  if (typeof IntersectionObserver === "undefined") {
    (window as any).IntersectionObserver = class {
      constructor() {}
      observe() {
        return null;
      }
      unobserve() {
        return null;
      }
      disconnect() {
        return null;
      }
    };
  }

  // Polyfill ResizeObserver
  if (typeof ResizeObserver === "undefined") {
    (window as any).ResizeObserver = class {
      constructor() {}
      observe() {
        return null;
      }
      unobserve() {
        return null;
      }
      disconnect() {
        return null;
      }
    };
  }

  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Polyfill crypto.randomUUID
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  (global as any).crypto = {
    ...(global as any).crypto,
    randomUUID: () => "12345678-1234-1234-1234-123456789012",
  };
}

// Mock Navigator ServiceWorker
if (typeof navigator !== "undefined") {
  if (!navigator.serviceWorker) {
    (navigator as any).serviceWorker = {
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({}),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getRegistration: vi.fn().mockResolvedValue(null),
    };
  }
}
