// Replaces one store's listings in an existing snapshot with a crawled catalogue index,
// using the same pre-filter as build-snapshot.js (for stores refreshed separately, e.g. DACBY).
//   node scripts/merge-snapshot-store.js <snapshot.json> <store-id> "<Store name>" <index.json>
import fs from 'node:fs';
import { detectKind, detectPlatform } from '../src/matching/classify.js';
import { displayTitle } from '../src/matching/normalize.js';
import { cleanDacbyTitle } from '../src/adapters/dacby.js';

const [snapFile, store, name, indexFile] = process.argv.slice(2);
const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
const idx = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
const add = (idx.listings || []).map((l) => (l.store === 'dacby' ? { ...l, title: cleanDacbyTitle(l.title) } : l)).filter((l) => {
  const hint = (l.hints || []).join(' | ');
  const pf = detectPlatform(l.title, hint);
  return l.store === store && l.price > 0 && detectKind(l.title, hint) === 'game' && (pf === 'ps5' || pf === 'ps4-ps5-upgrade');
}).map((l) => ({ ...l, hints: (l.hints || []).filter((h) => /ps\s?[45]|playstation|game|pre-?owned/i.test(h)).slice(0, 4) }));
snap.listings = [...snap.listings.filter((l) => l.store !== store), ...add];
snap.stores = [...snap.stores.filter((s) => s.id !== store), { id: store, name, status: 'ok', count: add.length }];
snap.titles = [...new Set(snap.listings.map((l) => displayTitle(l.title)))].sort();
fs.writeFileSync(snapFile, JSON.stringify(snap));
console.log(`${store}: ${idx.listings?.length || 0} indexed -> ${add.length} PS5 games kept; snapshot now ${snap.listings.length} listings`);
