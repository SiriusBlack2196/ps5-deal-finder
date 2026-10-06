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
export function processListings(rawListings, preparedQuery) {
  const kept = [];
  const dropped = [];
  for (const r of rawListings) {
    const hintText = (r.hints || []).join(' | ');
    const fullTitle = r.variantTitle ? `${r.title} - ${r.variantTitle}` : r.title;

    if (r.variantTitle && isBuyback(r.variantTitle)) { dropped.push({ title: fullTitle, reason: 'buyback/sell-to-store variant' }); continue; }
    if (r.variantTitle && detectKind(r.variantTitle) === 'digital') { dropped.push({ title: fullTitle, reason: 'not a game (digital code variant)' }); continue; }
    if (!(r.price > 0)) { dropped.push({ title: fullTitle, reason: 'no price' }); continue; }

    const kind = detectKind(r.title, hintText);
    if (kind !== 'game') { dropped.push({ title: fullTitle, reason: `not a game (${kind})` }); continue; }

    const platform = detectPlatform(r.title, hintText);
    if (platform !== 'ps5' && platform !== 'ps4-ps5-upgrade') { dropped.push({ title: fullTitle, reason: `platform: ${platform}` }); continue; }

    const m = matchTitle(preparedQuery, r.title);
    if (!m) { dropped.push({ title: fullTitle, reason: 'different game' }); continue; }

    const condition = r.conditionHint || detectCondition(r.variantTitle, r.title, hintText.match(/pre-?owned/i)?.[0]);
    const edition = detectEdition(r.title, r.variantTitle);

    kept.push({
      store: r.store,
      title: fullTitle,
      displayTitle: displayTitle(r.title),
      price: Math.round(r.price),
      shipping: r.shipping ?? null,
      effectivePrice: Math.round(r.price) + (r.shipping ?? 0),
      condition,
      edition,
      platform,               // 'ps5' | 'ps4-ps5-upgrade' (shown as its own tag)
      preorder: /\bpre-?order\b/i.test(fullTitle),
      inStock: Boolean(r.inStock),
      url: r.url,
      imageUrl: r.imageUrl || null,
      fetchedAt: r.fetchedAt,
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
