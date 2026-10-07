# Lowscore

*Lowest score wins.* PS5 game price comparison across Indian stores.

Search a PS5 game, see every Indian store's price side by side, cheapest first.
Phase 1 stores: **Gameloot, Console Garage, Game Nation, E2Z**.

## Run it

Requires Node 22.13+ (uses the built-in `node:sqlite`, no native modules).

```bash
npm run install:all
cp server/.env.example server/.env      # set BOT_CONTACT

# development: two terminals
npm run dev:server                      # API on :8787
npm run dev:client                      # UI on :5173 (proxies /api)

# production: one process serves API + built UI on :8787
npm start
```

Verify matching against the live stores (prints every listing, and every
listing that was skipped with the reason):

```bash
npm run samples                                   # Spider-Man 2, God of War Ragnarok, EA FC 25
npm run samples -- "Astro Bot" "Ghost of Yotei"   # any query
USE_FIXTURES=1 npm run samples                    # offline, captured responses
npm test                                          # 16 tests
```

## Visual design

Follows the visual language of playstation.com: white pages on a cool light-grey ground, deep navy hero
bands, one PlayStation-style blue (`#0072CE`) for actions, pill buttons and inputs, 8–12px cards, a 2px
blue ring for hover and focus instead of drop shadows, light-weight display type and bold buttons.
Sony's SST typeface is proprietary, so the app uses the free humanist **Source Sans 3** (self-hosted via
`@fontsource`). New-copy deals use blue; pre-owned uses PlayStation Plus yellow (`#FFC800`) so the two are
never confused. It deliberately uses no Sony logos or PlayStation symbols. Tokens live in
`client/src/index.css`; shared pieces in `client/src/components/ui.jsx`.

## How each store is fetched

| Store | Platform | Endpoint | Notes |
|---|---|---|---|
| Gameloot | WooCommerce | `/wp-json/wc/store/v1/products?search=` | Prices in rupees (`currency_minor_unit: 0`). New and pre-owned are separate products; condition comes from the `PRE-OWNED` category, pre-orders from `PRE-ORDER`. **Only answers requests from Indian IP addresses**, so the live server must run in India (e.g. Fly.io `bom`, Mumbai) for Gameloot results; the snapshot was captured through an Indian network location. |
| E2Z | WooCommerce | same | Prices in **paise** (`currency_minor_unit: 2`). robots.txt blocks `/search/`, not the Store API. |
| Console Garage | Shopify | `/search/suggest.json` then `/products/<handle>.js` | One product per game with variants **Pre-Owned / NEW / BUYBACK (SELL)**. The suggest price is the *buyback* price (what they pay you), so the adapter always expands variants and drops buyback ones. |
| Game Nation | Custom Next.js + JSON API | **working** | The site renders client-side from a public JSON API at `gamenation.in/Api` (found in its JS bundle). The adapter calls `/Products/Games/Index?term=…&PS5=1&TypeGames=1`, which returns name, price, MRP, new/used and availability; trade-in (buyback) values in the same response are ignored. Product links follow the site's own `<slug>-<ProductId>` rule. |
| Games The Shop | Custom Next.js + JSON API | **working** | Search runs in the browser against `green-api.gamestheshop.com`; the adapter POSTs to `/storefront/products/filter` with `{ searchQuery, platforms: ['PS5'], categories: ['Game Software'], is_digital: false }`. Returns sale price, regular price (MRP), edition and stock. New copies only; a zero-result search comes back as HTTP 404. |

No adapter needed HTML scraping.

## Architecture

```
client/  React + Tailwind v4 (Vite)
  lib/useSearchStream.js   EventSource; each store row fills in as it answers
  lib/derive.js            best deal, best pre-owned, filters, price spread

server/  Node + Express
  adapters/                one module per store, same interface:
                           search(query, {http, signal}) -> RawListing[]
  matching/normalize.js    title -> tokens ("Marvel’s Spider-Man 2 PS5" -> spiderman 2)
  matching/classify.js     platform, game vs console/accessory/merch/digital, condition, edition, buyback
  matching/match.js        exact / related / no match (numbers must match exactly)
  matching/pipeline.js     applies the above identically to every store
  search.js                parallel adapters, 6s timeout each, 30-min cache, failures isolated
  lib/http.js              User-Agent, per-host rate limit, robots.txt, abort, fixture mode
  lib/db.js                SQLite: every fetched price + timestamp (price_observations)
```

**API:** `GET /api/search/stream?q=` (SSE: `start`, one `store` per store, `done`),
`GET /api/search?q=` (all at once), `/api/suggest?q=`, `/api/popular`, `/api/stores`,
`/api/history?q=` (already returns recorded prices for the future history chart).

### Matching rules
- Every query word must be in the title (typos tolerated on long words; "spider man" = "spiderman"; aliases like GOW, GTA, FIFA→FC).
- Numbers are exact: "FC 25" never matches "FC 26"; "Spider-Man 2" never matches "Spider-Man (2018)".
- Titles with extra words ("God of War" vs "God of War Ragnarok") are *related*, not exact — offered as "Looking for a different game?" instead of mixed into the results.
- Dropped: consoles, controllers/accessories, merch, digital codes/PSN, DLC, PS4/Xbox/Switch/PC copies. PS4 copies labelled "free PS5 upgrade" are kept with their own tag and excluded from Best deal.

### Best deal logic
- **Best deal** = cheapest in-stock *new* PS5 copy.
- **Best pre-owned** = cheapest in-stock pre-owned copy, shown only if it beats the best new price. The two never share a callout.
- Shipping isn't exposed by any Phase 1 store's API, so effective price = item price and the UI says "Shipping not listed".

## Phase 2 hooks
- Add `adapters/amazon.js` and `adapters/flipkart.js` with the same `search()` interface and register them in `adapters/index.js`. A failing/blocked adapter already degrades to "Couldn't fetch from <store>".
- Key placeholders: `AMAZON_PAAPI_*`, `FLIPKART_AFFILIATE_*` in `.env.example`, read in `config.js`.
- Price history / alerts: query `price_observations` (indexed by game and URL).

## Critic ratings

The results header shows each game's critic rating as stars: the Metacritic Metascore (0–100) as 0–5 stars in half steps, with the critic review count and a link to the Metacritic page. Scores are collected by `.github/workflows/ratings.yml` for the titles in `ratings/titles.json` into `ratings/scores.json`, which is bundled into the client. Games with no published score (unreleased, or no Metacritic page) show "No critic score yet". None of the stores publish their own ratings.
