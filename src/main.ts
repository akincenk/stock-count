import { loadCatalog, type Catalog, type Settings } from "./api";
import { CountSession, normalizeCode } from "./count";
import { CountQueue } from "./queue";
import { startScanner } from "./scanner";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const SETTINGS_KEY = "stock-count.settings";

const session = new CountSession();
const queue = new CountQueue();
let catalog: Catalog | null = null;
let stopCamera: (() => void) | null = null;

function settings(): Settings | null {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    return s?.baseUrl && s?.apiKey ? s : null;
  } catch {
    return null;
  }
}

function el(tag: string, text = "", cls = ""): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text; // scanned codes are untrusted input; never use innerHTML here
  if (cls) e.className = cls;
  return e;
}

function renderCount(): void {
  const body = $("count-rows");
  body.replaceChildren();
  for (const [code, qty] of session.counts) {
    const tr = document.createElement("tr");
    const item = catalog?.byCode.get(code);
    const name = item ? item.sku.name : catalog ? "not in catalog" : "";
    const input = document.createElement("input");
    Object.assign(input, { type: "number", min: "0", step: "1", value: String(qty), inputMode: "numeric" });
    input.setAttribute("aria-label", `Quantity for ${code}`);
    input.addEventListener("change", () => {
      const n = Number(input.value);
      if (Number.isInteger(n) && n >= 0) session.set(code, n);
      else input.value = String(session.counts.get(code));
    });
    const del = el("button", "Remove");
    del.addEventListener("click", () => {
      session.delete(code);
      renderCount();
    });
    const qtyCell = document.createElement("td");
    qtyCell.append(input);
    const delCell = document.createElement("td");
    delCell.append(del);
    tr.append(el("td", code), el("td", name, item ? "" : "warn"), qtyCell, delCell);
    body.append(tr);
  }
}

function renderQueue(): void {
  const list = $("queue");
  list.replaceChildren();
  for (const c of queue.all()) {
    const li = el("li", `${c.code}: ${c.qty} (${new Date(c.countedAt).toLocaleString()})`);
    if (c.error) {
      li.append(el("span", ` rejected: ${c.error} `, "warn"));
      for (const [label, fn] of [["Retry", () => queue.retry(c.id)], ["Drop", () => queue.remove(c.id)]] as const) {
        const b = el("button", label);
        b.addEventListener("click", () => {
          fn();
          renderQueue();
        });
        li.append(b);
      }
    }
    list.append(li);
  }
}

function add(raw: string): void {
  const code = normalizeCode(raw);
  if (!code) return;
  const qty = session.add(code);
  $("scan-status").textContent = `${code}: ${qty}`;
  renderCount();
}

async function refreshCatalog(): Promise<void> {
  const s = settings();
  if (!s) return;
  try {
    catalog = await loadCatalog(s);
    renderCount();
  } catch (e) {
    $("sync-status").textContent = `Could not load SKUs: ${(e as Error).message}`;
  }
}

async function sync(): Promise<void> {
  const s = settings();
  const status = $("sync-status");
  if (!s) {
    status.textContent = "Add the server settings first.";
    return;
  }
  status.textContent = "Syncing...";
  const r = await queue.sync(s);
  status.textContent =
    `Sent ${r.sent}, rejected ${r.failed}.` + (r.stoppedBy ? ` Stopped: ${r.stoppedBy}. Will retry.` : "");
  renderQueue();
}

// --- wiring -------------------------------------------------------------------

const settingsForm = $<HTMLFormElement>("settings");
const saved = settings();
if (saved) {
  (settingsForm.elements.namedItem("baseUrl") as HTMLInputElement).value = saved.baseUrl;
  (settingsForm.elements.namedItem("apiKey") as HTMLInputElement).value = saved.apiKey;
} else {
  $<HTMLDetailsElement>("settings-box").open = true;
}
settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(settingsForm);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ baseUrl: f.get("baseUrl"), apiKey: f.get("apiKey") }));
  $<HTMLDetailsElement>("settings-box").open = false;
  refreshCatalog();
});

$<HTMLFormElement>("manual").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = (e.target as HTMLFormElement).elements.namedItem("code") as HTMLInputElement;
  add(input.value);
  input.value = "";
  input.focus();
});

$("camera").addEventListener("click", async () => {
  const video = $<HTMLVideoElement>("video");
  const button = $("camera");
  if (stopCamera) {
    stopCamera();
    stopCamera = null;
    video.hidden = true;
    button.textContent = "Start camera";
    return;
  }
  try {
    video.hidden = false;
    stopCamera = await startScanner(video, add);
    button.textContent = "Stop camera";
  } catch (e) {
    video.hidden = true;
    $("scan-status").textContent = `Camera not available: ${(e as Error).message}. Type codes instead.`;
  }
});

$("finish").addEventListener("click", () => {
  if (session.counts.size === 0) return;
  if (!confirm(`Queue ${session.counts.size} counted SKU(s) for sync and start a new count?`)) return;
  queue.add(session.counts);
  session.clear();
  renderCount();
  renderQueue();
  if (navigator.onLine) sync();
});

$("sync").addEventListener("click", sync);
window.addEventListener("online", sync);

renderCount();
renderQueue();
refreshCatalog();
