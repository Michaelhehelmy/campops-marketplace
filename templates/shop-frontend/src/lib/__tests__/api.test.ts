/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from "vitest";
import axios from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

// Mock toast before importing api
const mockToastError = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

// Mock window.location
Object.defineProperty(window, "location", {
  value: { href: "http://localhost:3000" },
  writable: true,
});

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock crypto.randomUUID
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: vi.fn().mockReturnValue("test-uuid-123"),
      },
      configurable: true,
    });

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "http://localhost:3000";
    delete (window as any).__TENANT_PROPERTY_ID__;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Request Interceptor", () => {
    it("adds token from localStorage", async () => {
      localStorage.setItem("token", "local-token-123");
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "get",
      };

      // Get the request interceptor
      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      expect(fulfilled).toBeDefined();

      const result = await fulfilled(config);
      expect(result.headers.Authorization).toBe("Bearer local-token-123");
    });

    it("adds token from sessionStorage when localStorage empty", async () => {
      sessionStorage.setItem("token", "session-token-456");
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "get",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers.Authorization).toBe("Bearer session-token-456");
    });

    it("does not add Authorization header when no token", async () => {
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "get",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers.Authorization).toBeUndefined();
    });

    it("adds X-Property-Id header when tenant is set", async () => {
      (window as any).__TENANT_PROPERTY_ID__ = "property-123";
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "get",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["X-Property-Id"]).toBe("property-123");
    });

    it("adds idempotency key for POST requests", async () => {
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "post",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["Idempotency-Key"]).toBe("test-uuid-123");
    });

    it("adds idempotency key for PUT requests", async () => {
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "put",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["Idempotency-Key"]).toBe("test-uuid-123");
    });

    it("adds idempotency key for PATCH requests", async () => {
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "patch",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["Idempotency-Key"]).toBe("test-uuid-123");
    });

    it("adds idempotency key for DELETE requests", async () => {
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "delete",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["Idempotency-Key"]).toBe("test-uuid-123");
    });

    it("does not add idempotency key for GET requests", async () => {
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "get",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["Idempotency-Key"]).toBeUndefined();
    });

    it("handles uppercase HTTP methods", async () => {
      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "POST",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["Idempotency-Key"]).toBe("test-uuid-123");
    });

    it("adds csrf token from cookies for mutating requests", async () => {
      Object.defineProperty(document, "cookie", {
        value: "x-csrf-token=csrf-token-abc-999; other-cookie=val",
        writable: true,
      });

      const { api } = await import("../api");

      const config: Partial<InternalAxiosRequestConfig> = {
        headers: {} as any,
        method: "post",
      };

      const handlers = (api.interceptors.request as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;
      const result = await fulfilled(config);
      expect(result.headers["x-csrf-token"]).toBe("csrf-token-abc-999");
    });

    it("rejects with error on request failure", async () => {
      const { api } = await import("../api");
      const error = new Error("Request failed");

      const handlers = (api.interceptors.request as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
    });
  });

  describe("Response Interceptor - Error Handling", () => {
    it("handles 401 Unauthorized - clears token and redirects", async () => {
      localStorage.setItem("token", "test-token");
      sessionStorage.setItem("token", "test-token");
      const { api } = await import("../api");

      const error = {
        response: { status: 401, data: {} },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);

      expect(localStorage.getItem("token")).toBeNull();
      expect(sessionStorage.getItem("token")).toBeNull();
      expect(window.location.href).toBe("/login");
    });

    it("handles 403 Forbidden - shows insufficient permissions toast", async () => {
      const { api } = await import("../api");

      const error = {
        response: { status: 403, data: {} },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Insufficient permissions");
    });

    it("handles 422 Validation - shows field errors", async () => {
      const { api } = await import("../api");

      const error = {
        response: {
          status: 422,
          data: {
            errors: { email: "Invalid email", password: "Too short" },
          },
        },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Invalid email");
      expect(mockToastError).toHaveBeenCalledWith("Too short");
    });

    it("handles 422 Validation - shows message when no field errors", async () => {
      const { api } = await import("../api");

      const error = {
        response: { status: 422, data: { message: "Validation failed" } },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Validation failed");
    });

    it("handles 429 Too Many Requests", async () => {
      const { api } = await import("../api");

      const error = {
        response: { status: 429, data: {} },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Too many requests. Please try again later.");
    });

    it("handles 500 Server Error with message", async () => {
      const { api } = await import("../api");

      const error = {
        response: { status: 500, data: { message: "Database error" } },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Database error");
    });

    it("handles 502 Bad Gateway with default message", async () => {
      const { api } = await import("../api");

      const error = {
        response: { status: 502, data: {} },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Server error. Please try again later.");
    });

    it("handles 503 Service Unavailable with error field", async () => {
      const { api } = await import("../api");

      const error = {
        response: { status: 503, data: { error: "Service down" } },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Service down");
    });

    it("handles unknown status with message", async () => {
      const { api } = await import("../api");

      const error = {
        response: { status: 418, data: { message: "I'm a teapot" } },
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("I'm a teapot");
    });

    it("handles network error (no response)", async () => {
      const { api } = await import("../api");

      const error = {
        request: {},
        response: undefined,
        config: {},
        isAxiosError: true,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const rejected = handlers?.[0]?.rejected;

      await expect(rejected(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith("Network error. Please check your connection.");
    });

    it("passes through successful responses", async () => {
      const { api } = await import("../api");

      const response = {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };

      const handlers = (api.interceptors.response as any).handlers;
      const fulfilled = handlers?.[0]?.fulfilled;

      expect(fulfilled(response)).toBe(response);
    });
  });

  describe("HTTP Helper Functions", () => {
    it("get returns data from response", async () => {
      const { get, api } = await import("../api");
      const mockData = { items: [] };

      vi.spyOn(api, "get").mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      const result = await get("/test");
      expect(result).toEqual(mockData);
    });

    it("post returns data from response", async () => {
      const { post, api } = await import("../api");
      const mockData = { id: 1 };

      vi.spyOn(api, "post").mockResolvedValue({
        data: mockData,
        status: 201,
        statusText: "Created",
        headers: {},
        config: {} as any,
      });

      const result = await post("/test", { name: "Test" });
      expect(result).toEqual(mockData);
    });

    it("put returns data from response", async () => {
      const { put, api } = await import("../api");
      const mockData = { updated: true };

      vi.spyOn(api, "put").mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      const result = await put("/test/1", { name: "Updated" });
      expect(result).toEqual(mockData);
    });

    it("patch returns data from response", async () => {
      const { patch, api } = await import("../api");
      const mockData = { patched: true };

      vi.spyOn(api, "patch").mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      const result = await patch("/test/1", { status: "active" });
      expect(result).toEqual(mockData);
    });

    it("del returns data from response", async () => {
      const { del, api } = await import("../api");
      const mockData = { deleted: true };

      vi.spyOn(api, "delete").mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

      const result = await del("/test/1");
      expect(result).toEqual(mockData);
    });
  });
});
