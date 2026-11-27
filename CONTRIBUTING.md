# Contributing

Thanks for looking at stock-count. Issues and pull requests are welcome.

## Set up

You need Node 22.12 or newer.

```sh
npm ci
npx playwright install chromium   # once, for the browser test
```

## Before you open a pull request

```sh
npm test           # unit tests (Vitest + jsdom)
npm run build      # type check and production build
npm run test:e2e   # Playwright smoke test against the mock API
gitleaks dir .
```

CI runs the same checks, plus a gitleaks scan of the history and zizmor on the workflows.

## Guidelines

- One change per pull request, with tests. Bug fixes start with a test that fails.
- Keep logic that can be tested without a browser in `src/count.ts`, `src/queue.ts` and `src/api.ts`, with unit tests in `tests/`. Behaviour you can only see in the page goes in `e2e/smoke.spec.ts`.
- The browser test talks to `e2e/mock-api.ts`, never to a real server. If you need a new API route, add it to the mock in the same shape as Warehouse-inventory-api.
- Scanned and typed codes are untrusted text. Write them to the page with `textContent`, never `innerHTML`.
- No new runtime dependency without a good reason; the app has one (`@zxing/browser`) and loads it only when `BarcodeDetector` is missing.
- Sample SKUs, names and API keys must be made up.
- The planned work is in [ROADMAP.md](ROADMAP.md); each item has a GitHub issue. Comment on the issue before starting a large item.
