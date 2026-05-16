import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, "..");
  const envFiles = loadEnv(mode, rootDir, "");
  const env: Record<string, string> = { ...process.env, ...envFiles } as Record<string, string>;

  const shopSlug = env.VITE_SHOP_SLUG;
  const buildMode = env.VITE_BUILD_MODE || "default";

  // In shop build mode, use generic branding that will be resolved at runtime
  const appName = shopSlug ? "{{SHOP_NAME}}" : env.VITE_APP_NAME || "Acacia Camp";
  const appShortName = shopSlug ? "{{SHOP_SHORT_NAME}}" : env.VITE_APP_SHORT_NAME || appName;
  const primaryColor = env.VITE_APP_PRIMARY_COLOR || "#0f172a";

  return {
    envDir: path.resolve(__dirname, ".."),
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "script",
        includeAssets: [
          "favicon.ico",
          "favicon.svg",
          "apple-touch-icon.png",
          "mask-icon.svg",
          "pwa-192x192.png",
          "pwa-512x512.png",
        ],
        manifest: {
          name: appName,
          short_name: appShortName,
          theme_color: primaryColor,
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /sw\.js$/],
        },
        devOptions: { enabled: true, type: "module" },
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
      }),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      preserveSymlinks: true,
    },
    server: {
      port: 5173,
      fs: { allow: [path.resolve(__dirname, ".."), __dirname] },
      proxy: {
        "^/api/admin/.*": {
          target: "http://localhost:5002",
          changeOrigin: true,
        },
        "^/api/branding": {
          target: "http://localhost:5002",
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
        "/socket.io": {
          target: "http://localhost:5000",
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
