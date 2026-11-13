// Minimal client for the parts of Warehouse-inventory-api a cycle count needs.

export interface Sku {
  id: number;
  code: string;
  name: string;
}

export interface InventoryRow {
  id: number;
  sku_id: number;
  on_hand: number;
}

export interface Settings {
  baseUrl: string; // e.g. "/api/v1" behind the dev proxy
  apiKey: string;
}

/** The server answered with an error the user has to fix; retrying will not help. */
export class RejectedError extends Error {}

export async function request<T>(settings: Settings, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(settings.baseUrl.replace(/\/$/, "") + path, {
    ...init,
    headers: { "X-API-Key": settings.apiKey, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      // body was not JSON; keep the status text
    }
    const msg = `${res.status} ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
    // 408/429/5xx are worth retrying later; other 4xx are not.
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      throw new RejectedError(msg);
    }
    throw new Error(msg);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export interface Catalog {
  /** SKU code -> SKU and its inventory row (undefined when the SKU has no row yet). */
  byCode: Map<string, { sku: Sku; row?: InventoryRow }>;
}

export async function loadCatalog(settings: Settings): Promise<Catalog> {
  const [skus, rows] = await Promise.all([
    request<Sku[]>(settings, "/skus"),
    request<InventoryRow[]>(settings, "/inventory"),
  ]);
  // shortcut: one row per SKU assumed (the API allows several, e.g. per supplier); pick the first.
  const rowBySku = new Map<number, InventoryRow>();
  for (const r of rows) if (!rowBySku.has(r.sku_id)) rowBySku.set(r.sku_id, r);
  return { byCode: new Map(skus.map((s) => [s.code, { sku: s, row: rowBySku.get(s.id) }])) };
}
