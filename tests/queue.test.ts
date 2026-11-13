import { afterEach, describe, expect, it, vi } from "vitest";
import { CountQueue } from "../src/queue";
import { fakeFetch, MemoryStore } from "./helpers";

const settings = { baseUrl: "/api/v1", apiKey: "k" };
const SKUS = [
  { id: 1, code: "BOLT-M8", name: "M8 bolt" },
  { id: 2, code: "NO-ROW", name: "No row yet" },
];
const ROWS = [{ id: 10, sku_id: 1, on_hand: 4 }];

function server(put: () => { status: number } | Error = () => ({ status: 200 })) {
  return fakeFetch((url, init) => {
    if (init.method === "PUT") return put();
    return { status: 200, body: url.endsWith("/skus") ? SKUS : ROWS };
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("CountQueue", () => {
  it("sends counts as absolute on_hand values and empties the queue", async () => {
    const q = new CountQueue(new MemoryStore());
    q.add(new Map([["BOLT-M8", 12]]));
    const calls = server();

    expect(await q.sync(settings)).toEqual({ sent: 1, failed: 0 });

    const put = calls.find((c) => c.init.method === "PUT")!;
    expect(put.url).toBe("/api/v1/inventory/10");
    expect(JSON.parse(put.init.body as string)).toEqual({ on_hand: 12 });
    expect(q.all()).toEqual([]);
  });

  it("keeps everything when offline", async () => {
    const q = new CountQueue(new MemoryStore());
    q.add(new Map([["BOLT-M8", 12]]));
    fakeFetch(() => new TypeError("Failed to fetch"));

    const r = await q.sync(settings);
    expect(r.sent).toBe(0);
    expect(r.stoppedBy).toContain("Failed to fetch");
    expect(q.all()).toHaveLength(1);
    expect(q.all()[0].error).toBeUndefined();
  });

  it("stops on a server error and keeps the rest for later", async () => {
    const q = new CountQueue(new MemoryStore());
    q.add(new Map([["BOLT-M8", 1]]));
    q.add(new Map([["BOLT-M8", 2]]));
    let n = 0;
    server(() => (n++ === 0 ? { status: 200 } : { status: 502 }));

    const r = await q.sync(settings);
    expect(r).toMatchObject({ sent: 1, failed: 0 });
    expect(q.all().map((c) => c.qty)).toEqual([2]);
  });

  it("marks unknown SKUs and SKUs without a row as rejected and goes on", async () => {
    const q = new CountQueue(new MemoryStore());
    q.add(new Map([["GHOST", 1], ["NO-ROW", 2], ["BOLT-M8", 3]]));
    server();

    expect(await q.sync(settings)).toEqual({ sent: 1, failed: 2 });
    const errors = q.all().map((c) => c.error);
    expect(errors).toEqual(["unknown SKU GHOST", "SKU NO-ROW has no inventory row"]);

    // rejected counts are not resent until someone retries them
    const calls = server();
    expect(await q.sync(settings)).toEqual({ sent: 0, failed: 0 });
    expect(calls).toHaveLength(0);

    q.retry(q.all()[0].id);
    expect(q.all()[0].error).toBeUndefined();
  });

  it("records a 4xx from the PUT on that count", async () => {
    const q = new CountQueue(new MemoryStore());
    q.add(new Map([["BOLT-M8", 3]]));
    server(() => ({ status: 422 }));

    expect(await q.sync(settings)).toEqual({ sent: 0, failed: 1 });
    expect(q.all()[0].error).toMatch(/^422/);
  });
});
