import { expect, test } from "@playwright/test";
import { MOCK_API_PORT } from "../playwright.config";
import { API_KEY, startMockApi, type Received } from "./mock-api";

let received: Received[];
let close: () => void;

test.beforeAll(async () => {
  const mock = await startMockApi(MOCK_API_PORT);
  received = mock.received;
  close = () => mock.server.close();
});
test.afterAll(() => close());

test("count two codes, finish, and sync them to the API", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/");

  await page.getByLabel("API key").fill(API_KEY);
  await page.getByRole("button", { name: "Save" }).click();
  // The catalog loaded through the Vite proxy once item names show up.
  const code = page.getByLabel("SKU code");
  for (const c of ["A12-001", "A12-001", "A12-005", "A12-013"]) {
    await code.fill(c);
    await code.press("Enter");
  }
  await expect(page.getByRole("cell", { name: "Packing tape 48mm" })).toBeVisible();
  await expect(page.getByLabel("Quantity for A12-001")).toHaveValue("2");

  // A hand-corrected quantity is what gets sent; a cleared field must not become 0 (#18).
  await page.getByLabel("Quantity for A12-005").fill("4");
  await page.getByLabel("Quantity for A12-005").press("Tab");
  await page.getByLabel("Quantity for A12-001").fill("");
  await page.getByLabel("Quantity for A12-001").press("Tab");
  await expect(page.getByLabel("Quantity for A12-001")).toHaveValue("2");

  await page.getByRole("button", { name: "Finish count" }).click();
  await expect(page.locator("#sync-status")).toHaveText("Sent 2, rejected 1.");
  await expect(page.locator("#queue")).toContainText("SKU A12-013 has no inventory row");

  const puts = received.filter((r) => r.method === "PUT");
  expect(puts).toEqual([
    { method: "PUT", path: "/api/v1/inventory/10", apiKey: API_KEY, body: { on_hand: 2 } },
    { method: "PUT", path: "/api/v1/inventory/11", apiKey: API_KEY, body: { on_hand: 4 } },
  ]);
  expect(received.every((r) => r.apiKey === API_KEY)).toBe(true);
});

test("a code over 64 characters is refused with a message, not cut and counted (#21)", async ({ page }) => {
  await page.goto("/");
  const code = page.getByLabel("SKU code");
  // The first 64 characters alone would be a valid, different code.
  await code.fill("A12-005".padEnd(64, "0") + "777777");
  await code.press("Enter");
  await expect(page.locator("#scan-status")).toHaveText("Code is longer than 64 characters (70), not counted.");
  await code.fill("   ");
  await code.press("Enter");
  await expect(page.locator("#scan-status")).toHaveText("Empty code, not counted.");
  await expect(page.locator("#count-rows tr")).toHaveCount(0);
});
