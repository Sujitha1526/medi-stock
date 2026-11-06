import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: "0.0.0.0" },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/recharts/")) return "charts";
          if (id.includes("/node_modules/d3-") || id.includes("/node_modules/victory-vendor/")) return "chart-core";
        },
      },
    },
  },
});
