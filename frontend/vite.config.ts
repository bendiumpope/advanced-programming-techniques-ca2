import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Must match backend PORT (default 5001; see backend/run.py). */
const backendPort = process.env.VITE_API_PORT ?? "5001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
});
