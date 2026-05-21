/**
 * Axios HTTP client with interceptors
 * Handles authentication, idempotency keys, and error handling
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "";

/**
 * Axios instance with default config
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: add auth token, tenant property context, and idempotency key
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Tenant context injected by Next.js proxy on subdomain/custom-domain requests
    const tenantPropertyId = (window as any).__TENANT_PROPERTY_ID__ as string | undefined;
    if (tenantPropertyId) {
      config.headers["X-Property-Id"] = tenantPropertyId;
    }

    // Add idempotency key and CSRF token for mutation requests
    const method = config.method?.toLowerCase();
    if (method && ["post", "put", "patch", "delete"].includes(method)) {
      if (!config.headers) config.headers = {} as any;
      config.headers["Idempotency-Key"] = crypto.randomUUID();

      // Read x-csrf-token from cookies to include in mutated requests (Double-Submit Token Pattern)
      if (typeof document !== "undefined") {
        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("x-csrf-token="))
          ?.split("=")[1];
        if (csrfToken) {
          config.headers["x-csrf-token"] = decodeURIComponent(csrfToken);
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as {
        message?: string;
        error?: any;
        errors?: Record<string, string>;
      };

      const errorMsg =
        data.error && typeof data.error === "object" && "message" in data.error
          ? data.error.message
          : data.error;

      switch (status) {
        case 401:
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          window.location.href = "/login";
          break;
        case 403:
          toast.error("Insufficient permissions");
          break;
        case 422:
          if (data.errors) {
            Object.values(data.errors).forEach((msg) => toast.error(msg));
          } else {
            toast.error(data.message || errorMsg || "Validation error");
          }
          break;
        case 429:
          toast.error("Too many requests. Please try again later.");
          break;
        case 500:
        case 502:
        case 503:
          toast.error(data.message || errorMsg || "Server error. Please try again later.");
          break;
        default:
          toast.error(data.message || errorMsg || "An error occurred");
      }
    } else if (error.request) {
      toast.error("Network error. Please check your connection.");
    }

    return Promise.reject(error);
  }
);

/**
 * Typed GET request helper
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<T>(url, config);
  return response.data;
}

/**
 * Typed POST request helper
 */
export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.post<T>(url, data, config);
  return response.data;
}

/**
 * Typed PUT request helper
 */
export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<T>(url, data, config);
  return response.data;
}

/**
 * Typed PATCH request helper
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.patch<T>(url, data, config);
  return response.data;
}

/**
 * Typed DELETE request helper
 */
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<T>(url, config);
  return response.data;
}
