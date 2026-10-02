import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "server/index.js",
    outDir: "dist-api",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "server.js",
      },
    },
  },
});