import { vi } from "vitest";

export class MemoryStore {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

type Handler = (url: string, init: RequestInit) => { status: number; body?: unknown } | Error;

/** Replace fetch with a handler and record each call. */
export function fakeFetch(handler: Handler) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const r = handler(url, init);
    if (r instanceof Error) throw r;
    return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), { status: r.status });
  });
  return calls;
}
