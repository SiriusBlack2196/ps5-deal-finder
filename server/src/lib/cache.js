// In-memory TTL cache with in-flight de-duplication: if two users search the
// same game at the same moment, the store is hit once.

export class TtlCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.map = new Map();
    this.inflight = new Map();
  }
  get(key) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() - e.at > this.ttlMs) { this.map.delete(key); return undefined; }
    return e;
  }
  set(key, value) {
    this.map.set(key, { value, at: Date.now() });
    if (this.map.size > 5000) this.map.delete(this.map.keys().next().value);
  }
  /** Returns { value, at, cached } */
  async getOrCompute(key, compute) {
    const hit = this.get(key);
    if (hit) return { value: hit.value, at: hit.at, cached: true };
    if (this.inflight.has(key)) return this.inflight.get(key);
    const p = (async () => {
      try {
        const value = await compute();
        this.set(key, value);
        return { value, at: Date.now(), cached: false };
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }
}
