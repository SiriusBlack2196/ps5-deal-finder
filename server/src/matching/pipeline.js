// Applies the same classification + matching to every adapter's raw output,
// so stores can't disagree on what counts as "Pre-owned" or "PS5".

import { detectPlatform, detectKind, detectCondition, detectEdition, isBuyback } from './classify.js';
import { matchTitle } from './match.js';
import { displayTitle } from './normalize.js';

/**
 * Raw listing, as returned by adapters:
 * { store, title, price, shipping, inStock, url, imageUrl, fetchedAt,
 *   hints?: string[],          // categories / product type / tags from the store
 *   variantTitle?: string,     // Shopify variant name, e.g. "Pre-Owned (USED)"
 *   conditionHint?: 'new'|'preowned' }
 *
 * Returns { kept: Listing[], dropped: {title, reason}[] }
 */
/**
 * Classifies one raw listing without any query: returns { listing } or { dropped }.
 * `listing` has everything except the match fields.
 */
export function classifyListing(r) {
  const hintText = (r.hints || []).join(' | ');
  const fullTitle = r.variantTitle ? `${r.title} - ${r.variantTitle}` : r.title;
  const drop = (reason) => ({ dropped: { title: fullTitle, reason } });

  if (r.variantTitle && isBuyback(r.variantTitle)) return drop('buyback/sell-to-store variant');
  if (r.variantTitle && detectKind(r.variantTitle) === 'digital') return drop('not a game (digital code variant)');
  if (!(r.price > 0)) return drop('no price');

  const kind = detectKind(r.title, hintText);
  if (kind !== 'game') return drop(`not a game (${kind})`);

  const platform = detectPlatform(r.title, hintText);
  if (platform !== 'ps5' && platform !== 'ps4-ps5-upgrade') return drop(`platform: ${platform}`);

  const condition = r.conditionHint || detectCondition(r.variantTitle, r.title, hintText.match(/pre-?owned/i)?.[0]);
  const edition = detectEdition(r.title, r.variantTitle);
  return {
    listing: {
      store: r.store,
      title: fullTitle,
      displayTitle: displayTitle(r.title),
      price: Math.round(r.price),
      shipping: r.shipping ?? null,
      effectivePrice: Math.round(r.price) + (r.shipping ?? 0),
      // Store-stated MRP (WooCommerce regular_price / Shopify compare_at_price); null unless higher than the price.
      mrp: r.mrp > r.price ? Math.round(r.mrp) : null,
      discountPct: r.mrp > r.price ? Math.round((1 - r.price / r.mrp) * 100) : 0,
      condition,
      edition,
      platform,               // 'ps5' | 'ps4-ps5-upgrade' (shown as its own tag)
      preorder: Boolean(r.preorder) || /\bpre-?order\b/i.test(fullTitle),
      inStock: Boolean(r.inStock),
      url: r.url,
      imageUrl: r.imageUrl || null,
      fetchedAt: r.fetchedAt,
    },
  };
}

export function processListings(rawListings, preparedQuery) {
  const kept = [];
  const dropped = [];
  for (const r of rawListings) {
    const c = classifyListing(r);
    if (c.dropped) { dropped.push(c.dropped); continue; }
    const m = matchTitle(preparedQuery, r.title);
    if (!m) { dropped.push({ title: c.listing.title, reason: 'different game' }); continue; }
    kept.push({
      ...c.listing,
      matchType: m.matchType, // 'exact' | 'related'
      matchScore: m.score,
      gameKey: m.gameKey,
    });
  }
  // de-duplicate (same URL can come back twice from a store's search)
  const seen = new Set();
  const unique = kept.filter((l) => (seen.has(l.url) ? false : seen.add(l.url)));
  unique.sort((a, b) => a.effectivePrice - b.effectivePrice);
  return { kept: unique, dropped };
}
