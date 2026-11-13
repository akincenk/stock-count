import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCatalog, RejectedError, request } from "../src/api";
import { fakeFetch } from "./helpers";

const settings = { baseUrl: "/api/v1/", apiKey: "k1" };
afterEach(() => vi.unstubAllGlobals());

describe("request", () => {
  it("sends the API key and joins the path", async () => {
    const calls = fakeFetch(() => ({ status: 200, body: [] }));
    await request(settings, "/skus");
    expect(calls[0].url).toBe("/api/v1/skus");
    expect((calls[0].init.headers as Record<string, string>)["X-API-Key"]).toBe("k1");
  });

  it("treats 4xx as rejected and 5xx as retryable", async () => {
    fakeFetch(() => ({ status: 400, body: { detail: "SKU does not exist" } }));
    await expect(request(settings, "/x")).rejects.toThrow(RejectedError);
    await expect(request(settings, "/x")).rejects.toThrow("400 SKU does not exist");

    fakeFetch(() => ({ status: 503 }));
    const err = await request(settings, "/x").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(RejectedError);

    fakeFetch(() => ({ status: 429 }));
    expect(await request(settings, "/x").catch((e) => e)).not.toBeInstanceOf(RejectedError);
  });
});

describe("loadCatalog", () => {
  it("maps SKU codes to their first inventory row", async () => {
    fakeFetch((url) =>
      url.endsWith("/skus")
        ? { status: 200, body: [{ id: 1, code: "BOLT-M8", name: "M8 bolt" }, { id: 2, code: "NUT", name: "Nut" }] }
        : { status: 200, body: [{ id: 10, sku_id: 1, on_hand: 4 }, { id: 11, sku_id: 1, on_hand: 9 }] },
    );
    const c = await loadCatalog(settings);
    expect(c.byCode.get("BOLT-M8")?.row?.id).toBe(10);
    expect(c.byCode.get("NUT")?.row).toBeUndefined();
  });
});
