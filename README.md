# stock-count

[![CI](https://github.com/akincenk/stock-count/actions/workflows/ci.yml/badge.svg)](https://github.com/akincenk/stock-count/actions/workflows/ci.yml)

A small web app for warehouse cycle counts on a phone. You scan barcodes with the camera (or type SKU codes), each scan adds one to the count, and when you finish, the counts are queued and sent to a [Warehouse-inventory-api](https://github.com/akincenk/Warehouse-inventory-api) server. If there is no signal, counts wait in the queue on the device and are sent when the connection comes back.

## Who it is for

Small warehouses or stock rooms that already run Warehouse-inventory-api and want a way to count shelves without a dedicated handheld scanner.

## How it works

- **Scanning**: uses the browser's `BarcodeDetector` when available. Otherwise it loads [ZXing](https://github.com/zxing-js/browser) (only then, so the main bundle stays small). The same barcode held in front of the camera is counted once; take it away or scan another one to count again.
- **Count in progress**: kept in `localStorage`, so a reload or a locked phone does not lose it. Quantities can be edited by hand.
- **Sync**: each finished count becomes `PUT /api/v1/inventory/{id}` with `{"on_hand": <counted>}`. A count replaces the stored quantity; it does not add to it.
- **Errors**: if the network is down or the server returns 5xx, 408 or 429, syncing stops and the rest of the queue is tried later (on the `online` event or with "Sync now"). If the server rejects a count (unknown SKU, SKU without an inventory row, other 4xx), that count stays in the queue marked as rejected until someone retries or drops it.

## Stack

Vite, TypeScript without a framework, Vitest with jsdom. One runtime dependency: `@zxing/browser`.

## Run

You need Node 22.12+ and a running Warehouse-inventory-api (see its README; by default it listens on `localhost:8000`).

```sh
npm install
INVENTORY_API_URL=http://localhost:8000 npm run dev
```

Open the printed address, enter the API key under "Server settings" and start counting. The base URL stays `/api/v1`.

Camera access needs HTTPS or `localhost`. To use a phone on the same network during development, put the dev server behind an HTTPS tunnel or a local certificate (see [ROADMAP.md](ROADMAP.md)).

### Why a proxy

Warehouse-inventory-api does not send CORS headers, so the browser cannot call it from another origin. The Vite dev and preview servers forward `/api` to `INVENTORY_API_URL`. For a real deployment, serve `dist/` and the API from the same origin (for example one nginx or Caddy site with `/api` proxied to the API).

## Security notes

- The API key is stored in the browser's `localStorage` on the device. Anyone with that device and browser profile can use it. Use a device you control, and rotate the key on the server if a device is lost.
- Scanned codes are treated as untrusted text and only ever written with `textContent`.

## Test

```sh
npm test          # unit tests
npm run build     # type check and production build
```

See [ROADMAP.md](ROADMAP.md) for planned work.

## License

MIT, see [LICENSE](LICENSE).
