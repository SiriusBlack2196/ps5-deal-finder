# Fixtures

Real store responses captured on 6 Oct 2026 (IST) while building Phase 1, used by
tests and `npm run samples` (set USE_FIXTURES=1). Trimmed to the fields the adapters read.

- e2z/*, consolegarage/*: raw JSON from the stores' endpoints.
- gameloot/spider-man-2.json: Gameloot blocked raw fetches from the build environment;
  this file was rebuilt from a field-level extraction of the same endpoint, so treat
  stock flags as unverified. Other Gameloot queries are fixtured as HTTP 403 (blocked).
- Game Nation: no fixture — its API endpoint isn't configured yet.
