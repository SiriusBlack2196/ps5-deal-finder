// Game Nation (gamenation.in)
//
// The site is a client-rendered Next.js app backed by a public JSON API at
// https://gamenation.in/Api (found in its JS bundle). The games listing endpoint
// takes the same filters as the site's own search page:
//   GET /Api/Products/Games/Index?term=<q>&PS5=1&TypeGames=1&Page=<n>
//   -> { Count, Products: [{ FullName, ProductId, Price, MRP, Discount,
//        UsageType: 'New'|'Used'|'PreOrder', IsAvailable, ListingImage, ... }] }
// 20 products per page, prices in whole rupees. TradeInCash/TradeInCredit are
// what Game Nation pays YOU for the game; we never use them.
//
// Product page URL (same rule as the site's createProductSlug):
//   /Products/Games/<slug(FullName)>-<ProductId>
// where ProductId is base64url(JSON [id, 1=new | 2=pre-owned]).

import { storeSearchTerm } from '../matching/normalize.js';

const SITE = 'https://www.gamenation.in';
const API = 'https://gamenation.in/Api';
const MAX_PAGES = 2;

export const gameNationSlug = (title) => String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function gameNationProductUrl(slug, productId, conditionCode) {
  const token = /^\d+$/.test(String(productId))
    ? Buffer.from(JSON.stringify([Number(productId), Number(conditionCode)])).toString('base64url')
    : productId;
  return `${SITE}/Products/Games/${slug}-${token}`;
}

export function decodeGameNationUrl(url) {
  const m = url.match(/-([A-Za-z0-9_+/-]+?)\/?$/);
  if (!m) return null;
  try {
    const [id, cond] = JSON.parse(Buffer.from(m[1].split('-').pop(), 'base64url').toString('utf8'));
    return { id, condition: cond === 2 ? 'preowned' : 'new' };
  } catch { return null; }
}

/** Maps one API product to a raw listing (also used by the snapshot build). */
export function mapGameNationProduct(p, fetchedAt) {
  const usage = String(p.UsageType || '').toLowerCase();
  return {
    store: 'gamenation',
    title: p.FullName,
    price: Number(p.Price),
    mrp: Number(p.MRP) || null,
    shipping: null,
    inStock: p.IsAvailable !== false,
    url: gameNationProductUrl(gameNationSlug(p.FullName), p.ProductId),
    imageUrl: p.ListingImage || null,
    fetchedAt,
    hints: ['PS5', 'Games'],
    conditionHint: usage === 'used' ? 'preowned' : 'new',
    preorder: usage === 'preorder',
  };
}

export const gameNationAdapter = {
  id: 'gamenation',
  name: 'Game Nation',
  homepage: SITE,
  async search(query, { http, signal }) {
    const term = storeSearchTerm(query) || query;
    const fetchedAt = new Date().toISOString();
    const out = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${API}/Products/Games/Index?term=${encodeURIComponent(term)}&PS5=1&TypeGames=1&Page=${page}`;
      const data = await http.getJSON(url, { signal });
      if (!data || !Array.isArray(data.Products)) throw new Error('Unexpected response shape');
      out.push(...data.Products.filter((p) => p.FullName && p.Price > 0).map((p) => mapGameNationProduct(p, fetchedAt)));
      if (out.length >= (data.Count ?? 0) || data.Products.length === 0) break;
    }
    return out;
  },
};
