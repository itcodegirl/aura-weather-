import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
    hmr: false,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split the rarely-changing dependencies into their own
        // long-cache chunks. A deploy that only touches app code then
        // re-downloads just the app bundle; React, the scheduler, and
        // the icon set keep their content hashes (and the browser's
        // cache entry).
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (
            /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)
          ) {
            return "react-vendor";
          }
          if (id.includes("node_modules/lucide-react/")) {
            return "lucide";
          }
          return undefined;
        },
      },
    },
  },
});
