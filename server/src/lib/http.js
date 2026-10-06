// Polite HTTP client shared by every adapter:
//  - honest User-Agent
//  - per-host rate limiting (concurrency + minimum gap between requests)
//  - robots.txt respected (cached 24h per host)
//  - AbortSignal support so the 6s adapter timeout cancels in-flight requests
//  - optional fixture mode (no network) for tests and offline demos

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { isAllowedByRobots } from './robots.js';

export class HttpError extends Error {
  constructor(message, { status, url } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

// ---------- per-host limiter ----------
class HostLimiter {
  constructor({ concurrency, minGapMs }) {
    this.concurrency = concurrency;
    this.minGapMs = minGapMs;
    this.active = 0;
    this.lastStart = 0;
    this.queue = [];
  }
  schedule(task, signal) {
    return new Promise((resolve, reject) => {
      const entry = { task, resolve, reject, signal };
      if (signal) {
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener('abort', () => {
          const i = this.queue.indexOf(entry);
          if (i >= 0) { this.queue.splice(i, 1); reject(signal.reason); }
        }, { once: true });
      }
      this.queue.push(entry);
      this.#pump();
    });
  }
  #pump() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    const wait = Math.max(0, this.lastStart + this.minGapMs - Date.now());
    if (wait > 0) { clearTimeout(this.timer); this.timer = setTimeout(() => this.#pump(), wait); return; }
    const entry = this.queue.shift();
    this.active++;
    this.lastStart = Date.now();
    Promise.resolve()
      .then(entry.task)
      .then(entry.resolve, entry.reject)
      .finally(() => { this.active--; this.#pump(); });
    this.#pump();
  }
}

const limiters = new Map();
function limiterFor(host) {
  if (!limiters.has(host)) limiters.set(host, new HostLimiter(config.rateLimit));
  return limiters.get(host);
}

// ---------- network client ----------
async function networkFetch(url, { signal, accept = 'application/json' } = {}) {
  const u = new URL(url);
  if (config.respectRobotsTxt && !(await isAllowedByRobots(u, config.userAgent, networkTextNoRobots))) {
    throw new HttpError(`robots.txt disallows ${u.pathname}`, { url, status: 0 });
  }
  return limiterFor(u.host).schedule(async () => {
    const res = await fetch(url, {
      signal,
      redirect: 'follow',
      headers: { 'User-Agent': config.userAgent, Accept: accept, 'Accept-Language': 'en-IN,en;q=0.9' },
    });
    if (!res.ok) throw new HttpError(`HTTP ${res.status} from ${u.host}`, { status: res.status, url });
    return res.text();
  }, signal);
}

// robots.txt itself is fetched without the robots check (obviously).
async function networkTextNoRobots(url, signal) {
  const res = await fetch(url, { signal, headers: { 'User-Agent': config.userAgent } });
  if (!res.ok) return null;
  return res.text();
}

// ---------- fixture client ----------
// fixtures/manifest.json: [{ "match": "<regex on full URL>", "file": "relative/path" }]
function fixtureFetchFactory(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const rules = manifest.map((r) => ({ re: new RegExp(r.match, 'i'), file: r.file, status: r.status }));
  return async (url, { signal } = {}) => {
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 120)); // feel like a network
    if (signal?.aborted) throw signal.reason;
    const rule = rules.find((r) => r.re.test(url));
    if (!rule) throw new HttpError(`No fixture for ${url}`, { url, status: 404 });
    if (rule.status) throw new HttpError(`HTTP ${rule.status} (fixture)`, { url, status: rule.status });
    return fs.readFileSync(path.join(dir, rule.file), 'utf8');
  };
}

export function createHttpClient({ fixturesDir = config.fixturesDir } = {}) {
  const getText = fixturesDir ? fixtureFetchFactory(fixturesDir) : networkFetch;
  return {
    mode: fixturesDir ? 'fixtures' : 'network',
    getText,
    async getJSON(url, opts) {
      const text = await getText(url, opts);
      try {
        return JSON.parse(text);
      } catch {
        throw new HttpError(`Expected JSON from ${new URL(url).host}, got something else (blocked or HTML?)`, { url });
      }
    },
  };
}
