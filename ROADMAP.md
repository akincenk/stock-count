# Roadmap

Planned work after the first version. Estimates are rough. Each item has a GitHub issue.

| # | Item | Estimate |
|---|------|----------|
| 1 | Playwright smoke test in CI: mock API, type codes, finish, check the PUT requests | 3 h |
| 2 | Installable PWA: web app manifest, icons, and a service worker that caches the app shell so it opens without signal | 3 h |
| 3 | Locations: pick a location or bin before counting and keep it with each queued count | 2 h |
| 4 | Show the expected `on_hand` next to the count and highlight differences before finishing | 2 h |
| 5 | Count review screen: list differences, allow a recount of single lines, then confirm | 3 h |
| 6 | Create a missing inventory row from the app (`POST /inventory`) when a SKU has none, after confirmation | 2 h |
| 7 | Feedback on scan: short vibration and sound, with a setting to turn them off | 1 h |
| 8 | Torch toggle and camera picker for phones with several back cameras | 2 h |
| 9 | Export the current count and the queue as CSV for counts done without a server | 1.5 h |
| 10 | HTTPS dev setup for testing on a phone (local certificate through `@vitejs/plugin-basic-ssl` or a documented tunnel) | 1 h |
| 11 | Example deployment: Caddyfile and docker-compose that serve `dist/` and proxy `/api` to Warehouse-inventory-api on one origin | 2 h |
| 12 | Sync status in the header (pending count, last success time) and a retry with backoff while the app is open | 2 h |
| 13 | Keyboard-wedge scanner support: detect fast key bursts ending in Enter as one scan, outside the input field too | 2 h |
| 14 | Accessibility pass: focus order, live region wording, contrast, larger touch targets in the table | 1.5 h |

Total: about 28 hours.
