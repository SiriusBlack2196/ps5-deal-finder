import './env.js';

// Central configuration. Everything tunable lives here or in .env.

const env = process.env;

export const config = {
  port: Number(env.PORT || 8787),

  // Per-adapter hard timeout (spec: 6 seconds).
  adapterTimeoutMs: Number(env.ADAPTER_TIMEOUT_MS || 6000),

  // Search result cache (spec: 30 minutes).
  cacheTtlMs: Number(env.CACHE_TTL_MS || 30 * 60 * 1000),

  // Politeness: at most `concurrency` in-flight requests per host,
  // and at least `minGapMs` between request starts to the same host.
  rateLimit: {
    concurrency: Number(env.RATE_LIMIT_CONCURRENCY || 2),
    minGapMs: Number(env.RATE_LIMIT_MIN_GAP_MS || 400),
  },

  // Identify ourselves honestly. Set BOT_CONTACT to a URL or email you own.
  userAgent: `PS5DealFinder/0.1 (price comparison; ${env.BOT_CONTACT || 'contact: set BOT_CONTACT in .env'})`,

  respectRobotsTxt: env.RESPECT_ROBOTS_TXT !== 'false',

  dbPath: env.DB_PATH || new URL('../data/prices.db', import.meta.url).pathname,

  // When set, all HTTP is served from ./fixtures instead of the network
  // (used by tests and by `npm run samples`).
  fixturesDir: env.USE_FIXTURES ? new URL('../fixtures', import.meta.url).pathname : null,

  gameNation: {
    // Game Nation renders everything client-side; its search API could not be
    // discovered from outside India. Paste the request URL you see in the
    // browser's Network tab, with {q} where the search text goes.
    searchUrl: env.GAMENATION_SEARCH_URL || '',
  },

  // ---------------------------------------------------------------------------
  // PHASE 2 PLACEHOLDERS — not used yet.
  // Amazon Product Advertising API 5.0 (https://webservices.amazon.in/paapi5)
  amazon: {
    accessKey: env.AMAZON_PAAPI_ACCESS_KEY || '',
    secretKey: env.AMAZON_PAAPI_SECRET_KEY || '',
    partnerTag: env.AMAZON_PAAPI_PARTNER_TAG || '',
  },
  // Flipkart Affiliate API (https://affiliate.flipkart.com/api-docs)
  flipkart: {
    affiliateId: env.FLIPKART_AFFILIATE_ID || '',
    affiliateToken: env.FLIPKART_AFFILIATE_TOKEN || '',
  },
  // ---------------------------------------------------------------------------
};
