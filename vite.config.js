import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{html,js,css,ico,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        skipWaiting: false,
      },
    }),
  ],
});
