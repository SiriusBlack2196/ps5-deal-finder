// Price observation store. Every price we fetch is written with a timestamp so
// price history charts and price-drop alerts can be built later without
// changing the adapters. Uses Node's built-in SQLite (node:sqlite).

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDb(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS price_observations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      store         TEXT NOT NULL,
      url           TEXT NOT NULL,      -- includes ?variant= for Shopify variants
      title         TEXT NOT NULL,
      game_key      TEXT NOT NULL,      -- normalized title, used to group across stores
      condition     TEXT NOT NULL,      -- 'new' | 'preowned'
      edition       TEXT NOT NULL,
      platform      TEXT NOT NULL,      -- 'ps5' | 'ps4-ps5-upgrade'
      price         INTEGER NOT NULL,   -- whole rupees
      shipping      INTEGER,            -- whole rupees, NULL = unknown
      in_stock      INTEGER NOT NULL,
      fetched_at    TEXT NOT NULL       -- ISO 8601
    );
    CREATE INDEX IF NOT EXISTS idx_obs_game ON price_observations(game_key, fetched_at);
    CREATE INDEX IF NOT EXISTS idx_obs_url  ON price_observations(url, fetched_at);

    CREATE TABLE IF NOT EXISTS searches (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      query      TEXT NOT NULL,
      game_key   TEXT NOT NULL,
      searched_at TEXT NOT NULL
    );

    -- Titles we have seen, for autocomplete.
    CREATE TABLE IF NOT EXISTS known_titles (
      game_key   TEXT PRIMARY KEY,
      display    TEXT NOT NULL,
      last_seen  TEXT NOT NULL
    );
  `);
  // v2: store-stated MRP, for the "Best deals" list.
  if (!db.prepare('PRAGMA table_info(price_observations)').all().some((c) => c.name === 'mrp')) {
    db.exec('ALTER TABLE price_observations ADD COLUMN mrp INTEGER');
  }

  const insertObs = db.prepare(`INSERT INTO price_observations
    (store, url, title, game_key, condition, edition, platform, price, shipping, in_stock, fetched_at, mrp)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const upsertTitle = db.prepare(`INSERT INTO known_titles (game_key, display, last_seen) VALUES (?,?,?)
    ON CONFLICT(game_key) DO UPDATE SET last_seen = excluded.last_seen`);
  const insertSearch = db.prepare(`INSERT INTO searches (query, game_key, searched_at) VALUES (?,?,?)`);

  return {
    recordListings(listings) {
      db.exec('BEGIN');
      try {
        for (const l of listings) {
          insertObs.run(l.store, l.url, l.title, l.gameKey, l.condition, l.edition, l.platform,
            l.price, l.shipping ?? null, l.inStock ? 1 : 0, l.fetchedAt, l.mrp ?? null);
          if (l.displayTitle) upsertTitle.run(l.gameKey, l.displayTitle, l.fetchedAt);
        }
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    recordSearch(query, gameKey) {
      insertSearch.run(query, gameKey, new Date().toISOString());
    },
    knownTitles() {
      return db.prepare('SELECT game_key AS key, display FROM known_titles').all();
    },
    // Ready for the future price-history feature.
    history(gameKey, { sinceIso } = {}) {
      return db.prepare(`SELECT store, url, condition, edition, price, shipping, in_stock AS inStock, fetched_at AS fetchedAt
        FROM price_observations WHERE game_key = ? AND fetched_at >= ? ORDER BY fetched_at`)
        .all(gameKey, sinceIso || '1970-01-01');
    },
    // Latest observation per listing URL since `sinceIso` (input to latestReleases).
    latestObservations(sinceIso) {
      return db.prepare(`SELECT o.store, o.url, o.title, k.display AS displayTitle, o.condition, o.price, o.in_stock AS inStock
        FROM price_observations o
        JOIN (SELECT url, MAX(id) AS id FROM price_observations WHERE fetched_at >= ? GROUP BY url) last ON last.id = o.id
        LEFT JOIN known_titles k ON k.game_key = o.game_key`).all(sinceIso)
        .map((r) => ({ ...r, inStock: Boolean(r.inStock) }));
    },
    // Latest observation per listing URL since `sinceIso`, with an MRP (input to topDeals).
    latestDiscounted(sinceIso) {
      return db.prepare(`SELECT o.store, o.url, o.title, o.game_key AS gameKey, k.display AS displayTitle, o.condition, o.edition,
          o.price, o.mrp, o.in_stock AS inStock, o.fetched_at AS fetchedAt
        FROM price_observations o
        JOIN (SELECT url, MAX(id) AS id FROM price_observations WHERE fetched_at >= ? GROUP BY url) last ON last.id = o.id
        LEFT JOIN known_titles k ON k.game_key = o.game_key
        WHERE o.mrp > o.price`).all(sinceIso)
        .map((r) => ({ ...r, inStock: Boolean(r.inStock), discountPct: Math.round((1 - r.price / r.mrp) * 100) }));
    },
    close() { db.close(); },
  };
}
