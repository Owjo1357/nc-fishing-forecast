import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static single-page app. No backend, no API keys.
// Deploys as static files to Vercel (or any static host).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
