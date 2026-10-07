// Store registry. Order here = display order while loading.
//
// Adapter interface:
//   { id, name, homepage, phase, search(query, ctx) => Promise<RawListing[]> }
//   ctx = { http, signal, preparedQuery }
// RawListing = { store, title, price, shipping, inStock, url, imageUrl, fetchedAt,
//                hints?, variantTitle?, conditionHint? }
// Condition/edition/platform are derived centrally in matching/pipeline.js.

import { createWooAdapter } from './woocommerce.js';
import { createShopifyAdapter } from './shopify.js';
import { gameNationAdapter } from './gamenation.js';
import { cexAdapter } from './cex.js';
import { gamesTheShopAdapter } from './gamestheshop.js';

export const adapters = [
  { ...createWooAdapter({ id: 'gameloot', name: 'Gameloot', baseUrl: 'https://gameloot.in' }), phase: 1 },
  { ...createShopifyAdapter({ id: 'consolegarage', name: 'Console Garage', baseUrl: 'https://www.consolegarage.com' }), phase: 1 },
  { ...gameNationAdapter, phase: 1 },
  { ...createWooAdapter({ id: 'e2z', name: 'E2Z', baseUrl: 'https://e2zstore.com' }), phase: 1 },
  { ...cexAdapter, phase: 1 },
  { ...gamesTheShopAdapter, phase: 1 },

  // PHASE 2 — Amazon.in and Flipkart plug in here behind the same interface.
  // Keys are read from AMAZON_PAAPI_* and FLIPKART_AFFILIATE_* (see config.js).
];

export function publicStoreInfo(a) {
  return { id: a.id, name: a.name, homepage: a.homepage, phase: a.phase };
}
