// Games The Shop (gamestheshop.com)
//
// A custom Next.js storefront whose search runs in the browser against its own API:
//   POST https://green-api.gamestheshop.com/storefront/products/filter?page=1&limit=40
//   body { searchQuery, platforms: ['PS5'], categories: ['Game Software'], is_digital: false }
//   -> { status, data: [{ id (variant), product_id, name, platform.name, edition.name,
//        sale_price, regular_price, stock_status, thumbnail, is_digital }], meta }
// Prices are whole rupees; regular_price is the store's MRP. Games are sold new.
// Product page: /product/<product_id>?variant=<id>.

import { storeSearchTerm } from '../matching/normalize.js';

const SITE = 'https://www.gamestheshop.com';
const API = 'https://green-api.gamestheshop.com/storefront/products/filter';
const HEADERS = { Origin: SITE, Referer: `${SITE}/` };

/** Maps one storefront product (variant) to a raw listing (also used by the snapshot build). */
export function mapGtsProduct(p, fetchedAt) {
  const ed = p.edition?.name?.replace(/\s*edition\s*$/i, '').trim();
  // Only add the edition when the product name doesn't already say it ("... Complete Edition").
  const edition = ed && !/^standard$/i.test(ed) && !new RegExp(`\\b${ed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(p.name) ? ed : null;
  return {
    store: 'gamestheshop',
    title: p.name,
    variantTitle: edition ? `${edition} Edition` : undefined,
    price: Number(p.sale_price ?? p.regular_price),
    mrp: Number(p.regular_price) || null,
    shipping: null,
    inStock: !/out\s*of\s*stock/i.test(p.stock_status || '') && (p.inventory?.available_stock ?? 1) > 0,
    url: `${SITE}/product/${p.product_id}?variant=${p.id}`,
    imageUrl: p.thumbnail || null,
    fetchedAt,
    hints: [p.platform?.name, p.category?.name].filter(Boolean),
    conditionHint: 'new',
  };
}

export const gamesTheShopAdapter = {
  id: 'gamestheshop',
  name: 'Games The Shop',
  homepage: SITE,
  async search(query, { http, signal }) {
    const term = storeSearchTerm(query) || query;
    const body = { searchQuery: term, platforms: ['PS5'], categories: ['Game Software'], is_digital: false };
    let data;
    try {
      data = await http.postJSON(`${API}?page=1&limit=40`, body, { signal, headers: HEADERS });
    } catch (e) {
      if (e.status === 404) return [];   // the API answers 404 "Product not found" for zero results
      throw e;
    }
    if (!data || !Array.isArray(data.data)) throw new Error('Unexpected response shape');
    const fetchedAt = new Date().toISOString();
    return data.data
      .filter((p) => !p.is_digital && p.platform?.name === 'PS5' && (p.sale_price ?? p.regular_price) > 0)
      .map((p) => mapGtsProduct(p, fetchedAt));
  },
};
