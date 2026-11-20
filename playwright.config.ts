import { defineConfig, devices } from "@playwright/test";

// The smoke test starts its own mock of Warehouse-inventory-api on this port (see e2e/mock-api.ts)
// and the Vite dev server proxies /api to it, the same way it proxies to the real API.
export const MOCK_API_PORT = 18080;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:5173", ...devices["Pixel 7"] },
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    env: { INVENTORY_API_URL: `http://127.0.0.1:${MOCK_API_PORT}` },
    reuseExistingServer: false,
  },
});
