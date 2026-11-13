import { defineConfig } from "vitest/config";

// Warehouse-inventory-api sends no CORS headers, so the browser talks to it through this
// same-origin proxy in development. In production, serve the build behind the same origin.
const api = process.env.INVENTORY_API_URL ?? "http://localhost:8000";

export default defineConfig({
  server: { host: true, proxy: { "/api": api } },
  preview: { host: true, proxy: { "/api": api } },
  test: { environment: "jsdom" },
});
