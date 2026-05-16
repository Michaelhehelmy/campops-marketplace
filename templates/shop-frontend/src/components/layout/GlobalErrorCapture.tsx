import { useEffect } from "react";

export interface LoggedError {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: string;
  timestamp: string;
  type: "window" | "console" | "unhandledrejection";
}

// Global store to keep errors without needing a React context wrapper around everything
export const globalErrorStore: LoggedError[] = [];

export function GlobalErrorCapture() {
  useEffect(() => {
    // Intercept window.onerror
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      globalErrorStore.push({
        message: typeof message === "string" ? message : JSON.stringify(message),
        source,
        lineno,
        colno,
        error: error?.stack || error?.toString(),
        timestamp: new Date().toISOString(),
        type: "window",
      });
      // Limit to 50 errors
      if (globalErrorStore.length > 50) globalErrorStore.shift();
      if (originalOnError) return originalOnError(message, source, lineno, colno, error);
      return false;
    };

    // Intercept unhandledrejection
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      globalErrorStore.push({
        message: event.reason?.message || "Unhandled Promise Rejection",
        error: event.reason?.stack || event.reason?.toString(),
        timestamp: new Date().toISOString(),
        type: "unhandledrejection",
      });
      if (globalErrorStore.length > 50) globalErrorStore.shift();
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    // Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      globalErrorStore.push({
        message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
        timestamp: new Date().toISOString(),
        type: "console",
      });
      if (globalErrorStore.length > 50) globalErrorStore.shift();
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.onerror = originalOnError;
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
