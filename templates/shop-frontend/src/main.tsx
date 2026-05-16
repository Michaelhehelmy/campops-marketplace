/**
 * Application Entry Point
 * Renders the React app with all providers
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { queryClient } from "@/lib/queryClient";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "@/App";
import { PWAPrompt } from "@/components/PWAModal";
import { PluginSlotProvider } from "@/components/PluginSlot";
import { PluginRegistryProvider } from "@/lib/pluginRegistry";
import { registerSW } from "virtual:pwa-register";
import "@/index.css";

// Register Service Worker for PWA functionality
if (!navigator.webdriver) {
  registerSW({
    immediate: true,
    onRegisterError(error: any) {
      console.error("PWA: Service Worker registration failed!", error);
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrandingProvider>
      <QueryClientProvider client={queryClient}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <AuthProvider>
              <PluginRegistryProvider>
                <PluginSlotProvider>
                  <App />
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      className: "font-sans font-medium",
                      style: {
                        borderRadius: "12px",
                        background: "#1c1917",
                        color: "#fff",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      },
                      success: {
                        style: {
                          background: "#10b981",
                        },
                      },
                      error: {
                        style: {
                          background: "#ef4444",
                        },
                      },
                    }}
                  />
                  <PWAPrompt />
                </PluginSlotProvider>
              </PluginRegistryProvider>
            </AuthProvider>
          </GoogleOAuthProvider>
        </Router>
      </QueryClientProvider>
    </BrandingProvider>
  </React.StrictMode>
);
