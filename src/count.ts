// The count in progress: SKU code -> quantity. Saved on every change so a reload keeps it.

type KeyValue = Pick<Storage, "getItem" | "setItem">;
const KEY = "stock-count.session";

/** Trim a scanned or typed code; returns null if it cannot be a SKU code (the API allows 1-64 chars). */
export function normalizeCode(raw: string): string | null {
  const code = raw.trim();
  return code.length >= 1 && code.length <= 64 ? code : null;
}

export class CountSession {
  readonly counts: Map<string, number>;

  constructor(private store: KeyValue = localStorage) {
    let saved: [string, number][] = [];
    try {
      saved = JSON.parse(store.getItem(KEY) ?? "[]");
    } catch {
      // corrupt entry; start empty
    }
    this.counts = new Map(saved);
  }

  private save(): void {
    this.store.setItem(KEY, JSON.stringify([...this.counts]));
  }

  /** One scan or one tap adds one unit. */
  add(code: string, by = 1): number {
    const qty = Math.max(0, (this.counts.get(code) ?? 0) + by);
    this.counts.set(code, qty);
    this.save();
    return qty;
  }

  set(code: string, qty: number): void {
    if (!Number.isInteger(qty) || qty < 0) throw new RangeError("quantity must be a whole number >= 0");
    this.counts.set(code, qty);
    this.save();
  }

  delete(code: string): void {
    this.counts.delete(code);
    this.save();
  }

  clear(): void {
    this.counts.clear();
    this.save();
  }
}
