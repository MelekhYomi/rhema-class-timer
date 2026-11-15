import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build loads from file:// (Windows app) and the
// Android WebView as well as from a web server.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
