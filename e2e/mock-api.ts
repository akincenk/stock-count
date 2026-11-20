// A tiny stand-in for Warehouse-inventory-api: the routes stock-count uses, an API key check,
// and a record of every request so the test can check what reached the server.
import { createServer, type Server } from "node:http";

export interface Received {
  method: string;
  path: string;
  apiKey: string | undefined;
  body: unknown;
}

export const API_KEY = "e2e-test-key";

const skus = [
  { id: 1, code: "A12-001", name: "Packing tape 48mm", category: null },
  { id: 2, code: "A12-005", name: "Bubble wrap 12in", category: null },
  { id: 3, code: "A12-013", name: "Corner boards", category: null },
];
// A12-013 has no inventory row on purpose.
const inventory = [
  { id: 10, sku_id: 1, supplier_id: null, on_hand: 24, reorder_point: 10, reorder_qty: 50 },
  { id: 11, sku_id: 2, supplier_id: null, on_hand: 3, reorder_point: 10, reorder_qty: 50 },
];

export function startMockApi(port: number): Promise<{ server: Server; received: Received[] }> {
  const received: Received[] = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const path = req.url ?? "";
      const apiKey = req.headers["x-api-key"] as string | undefined;
      received.push({ method: req.method ?? "", path, apiKey, body: raw ? JSON.parse(raw) : undefined });
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (apiKey !== API_KEY) return send(401, { detail: "Invalid or missing API key" });
      if (req.method === "GET" && path === "/api/v1/skus") return send(200, skus);
      if (req.method === "GET" && path === "/api/v1/inventory") return send(200, inventory);
      const put = /^\/api\/v1\/inventory\/(\d+)$/.exec(path);
      const row = put && inventory.find((r) => r.id === Number(put[1]));
      if (req.method === "PUT" && row) {
        Object.assign(row, JSON.parse(raw));
        return send(200, row);
      }
      send(404, { detail: "Not found" });
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, received })));
}
