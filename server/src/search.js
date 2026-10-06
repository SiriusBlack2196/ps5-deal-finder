// Runs every adapter in parallel, each with its own 6s timeout, and reports
// each store as soon as it finishes (so the UI can fill rows progressively).
// A failing store never fails the search.

import { prepareQuery } from './matching/match.js';
import { processListings } from './matching/pipeline.js';
import { TtlCache } from './lib/cache.js';

export class TimeoutError extends Error {
  constructor(ms) { super(`Timed out after ${ms / 1000}s`); this.name = 'TimeoutError'; }
}

export function createSearchService({ adapters, http, db, config, logger = console }) {
  const cache = new TtlCache(config.cacheTtlMs);

  async function runAdapter(adapter, preparedQuery) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutError(config.adapterTimeoutMs)), config.adapterTimeoutMs);
    try {
      const raw = await Promise.race([
        adapter.search(preparedQuery.raw, { http, signal: controller.signal, preparedQuery }),
        new Promise((_, rej) => controller.signal.addEventListener('abort', () => rej(controller.signal.reason), { once: true })),
      ]);
      return processListings(raw, preparedQuery);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * @param {string} query
   * @param {(event: StoreResult) => void} onStore  called once per store
   * StoreResult = { store, status: 'ok'|'error', listings, dropped?, error?, cached, fetchedAt, ms }
   */
  async function search(query, onStore = () => {}) {
    const preparedQuery = prepareQuery(query);
    const cacheKeyBase = preparedQuery.key || query.toLowerCase().trim();
    db?.recordSearch(query, cacheKeyBase);

    const results = await Promise.all(adapters.map(async (adapter) => {
      const started = Date.now();
      let event;
      try {
        const { value, at, cached } = await cache.getOrCompute(`${adapter.id}::${cacheKeyBase}`, async () => {
          const out = await runAdapter(adapter, preparedQuery);
          try { db?.recordListings(out.kept); } catch (e) { logger.warn('[db] record failed', e.message); }
          return out;
        });
        event = {
          store: adapter.id, status: 'ok', listings: value.kept, dropped: value.dropped,
          cached, fetchedAt: new Date(at).toISOString(), ms: Date.now() - started,
        };
      } catch (err) {
        logger.warn(`[${adapter.id}] ${err?.message || err}`);
        event = {
          store: adapter.id, status: 'error', listings: [],
          error: friendlyError(err), ms: Date.now() - started,
        };
      }
      onStore(event);
      return event;
    }));

    return { query, gameKey: preparedQuery.key, stores: results };
  }

  return { search };
}

function friendlyError(err) {
  const msg = String(err?.message || err);
  if (err?.name === 'TimeoutError') return 'Store took too long to respond';
  if (/robots\.txt/.test(msg)) return 'Store does not allow automated search';
  if (/not configured/.test(msg)) return 'Store integration not set up yet';
  if (/HTTP 403|HTTP 429|blocked|Expected JSON/.test(msg)) return 'Store blocked the request';
  if (/HTTP 5\d\d/.test(msg)) return 'Store is having problems';
  return 'Store could not be reached';
}
