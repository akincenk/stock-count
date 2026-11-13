// Offline queue of finished counts. Counts are saved first and sent later, so a scan
// made with no signal in the back of the warehouse is not lost.

import { loadCatalog, RejectedError, request, type Settings } from "./api";

export interface QueuedCount {
  id: string;
  code: string;
  qty: number;
  countedAt: string; // ISO time
  error?: string; // set when the server rejected it; needs a person to look at it
}

type KeyValue = Pick<Storage, "getItem" | "setItem">;
const KEY = "stock-count.queue";

export class CountQueue {
  constructor(private store: KeyValue = localStorage) {}

  all(): QueuedCount[] {
    try {
      return JSON.parse(this.store.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  private save(items: QueuedCount[]): void {
    this.store.setItem(KEY, JSON.stringify(items));
  }

  add(counts: Map<string, number>, now = new Date()): void {
    const added = [...counts].map(([code, qty]) => ({
      id: crypto.randomUUID(),
      code,
      qty,
      countedAt: now.toISOString(),
    }));
    this.save([...this.all(), ...added]);
  }

  remove(id: string): void {
    this.save(this.all().filter((c) => c.id !== id));
  }

  /** Clear the error so the next sync tries the count again. */
  retry(id: string): void {
    this.save(this.all().map((c) => (c.id === id ? { ...c, error: undefined } : c)));
  }

  /**
   * Send pending counts in the order they were made. Rejected counts stay in the queue with
   * their error. A network or server error stops the run; what is left is tried next time.
   */
  async sync(settings: Settings): Promise<{ sent: number; failed: number; stoppedBy?: string }> {
    const pending = this.all().filter((c) => !c.error);
    if (pending.length === 0) return { sent: 0, failed: 0 };
    let sent = 0;
    let failed = 0;
    let catalog;
    try {
      catalog = await loadCatalog(settings);
    } catch (e) {
      return { sent, failed, stoppedBy: String((e as Error).message) };
    }
    for (const c of pending) {
      const row = catalog.byCode.get(c.code)?.row;
      try {
        if (!row) {
          throw new RejectedError(
            catalog.byCode.has(c.code) ? `SKU ${c.code} has no inventory row` : `unknown SKU ${c.code}`,
          );
        }
        await request(settings, `/inventory/${row.id}`, {
          method: "PUT",
          body: JSON.stringify({ on_hand: c.qty }),
        });
        this.remove(c.id);
        sent++;
      } catch (e) {
        if (!(e instanceof RejectedError)) return { sent, failed, stoppedBy: (e as Error).message };
        this.save(this.all().map((q) => (q.id === c.id ? { ...q, error: e.message } : q)));
        failed++;
      }
    }
    return { sent, failed };
  }
}
