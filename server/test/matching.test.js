import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareQuery, matchTitle } from '../src/matching/match.js';
import { detectPlatform, detectKind, detectCondition, detectEdition, isBuyback } from '../src/matching/classify.js';
import { storeSearchTerm } from '../src/matching/normalize.js';

const m = (q, t) => matchTitle(prepareQuery(q), t)?.matchType ?? null;

test('same game, different store spellings => exact', () => {
  assert.equal(m('Spider-Man 2', 'Marvel’s Spider-Man 2 PS5'), 'exact');
  assert.equal(m('Spider-Man 2', 'Spiderman 2  PS5'), 'exact');
  assert.equal(m('spider man 2', 'Marvels Spider-Man 2 PS5 (Pre-owned)'), 'exact');
  assert.equal(m('God of War Ragnarok', 'God Of War Ragnarök PS5'), 'exact');
  assert.equal(m('EA FC 25', 'FC 25 PS5'), 'exact');
  assert.equal(m('FIFA 25', 'EA Sports FC 25 PS5'), 'exact');
  assert.equal(m('gow ragnorak', 'God Of War Ragnarok PS5'), 'exact'); // alias + typo
  assert.equal(m('gta 5', 'Grand Theft Auto V PS5'), 'exact');          // roman numerals
});

test('numbers are exact: never mix sequels/years', () => {
  assert.equal(m('EA FC 25', 'FC 26 PS5'), null);
  assert.equal(m('EA FC 25', 'FC 24 PS5'), null);
  assert.equal(m('Spider-Man 2', 'Spiderman Marvel 2018 PS4'), null);
  assert.equal(m('Spider-Man 2', 'Marvel Spiderman Miles Morales PS5'), null);
});

test('broader titles are "related", not exact', () => {
  assert.equal(m('God of War', 'God Of War Ragnarok PS5'), 'related');
  assert.equal(m('God of War Ragnarok', "Assassin's Creed Valhalla Dawn of Ragnarok PS5"), null);
});

test('platform detection', () => {
  assert.equal(detectPlatform('FC 25 PS5'), 'ps5');
  assert.equal(detectPlatform('EA Sports FC 25 PS4'), 'ps4');
  assert.equal(detectPlatform('Some Game', 'BUY GAMES | BUY PS5 GAMES'), 'ps5');
  assert.equal(detectPlatform('Horizon Forbidden West PS4 (Free PS5 Upgrade)'), 'ps4-ps5-upgrade');
  assert.equal(detectPlatform('FC 25 EA SPORTS Nintendo Switch'), 'switch');
});

test('non-games are excluded', () => {
  assert.equal(detectKind('Sony PlayStation 5 Marvels Spider-Man 2 Limited Edition Console (Pre-owned)'), 'console');
  assert.equal(detectKind('DualSense Wireless Controller Spider-Man 2 Edition'), 'accessory');
  assert.equal(detectKind('Funko Pop Marvels Spider-Man 2'), 'merch');
  assert.equal(detectKind("PS5 Marvel's Spider-Man Remastered DIGITAL CODE"), 'digital');
  assert.equal(detectKind('Marvels Spider-Man 2 PS5', 'BUY GAMES | BUY PS5 GAMES'), 'game');
  assert.equal(detectKind('Code Only (No disc) (only digital code )'), 'digital');
});

test('condition, edition, buyback', () => {
  assert.equal(detectCondition('Pre-Owned (USED)'), 'preowned');
  assert.equal(detectCondition('Marvels Spider-Man 2 PS5 (Pre-owned)'), 'preowned');
  assert.equal(detectCondition('NEW'), 'new');
  assert.equal(detectEdition('Marvel Spiderman Miles Morales Ult Edition PS5'), 'Ultimate');
  assert.equal(detectEdition("Hogwarts Legacy Deluxe Edition"), 'Deluxe');
  assert.equal(detectEdition('God of War Ragnarok'), 'Standard');
  assert.ok(isBuyback('BUYBACK (SELL)'));
  assert.ok(!isBuyback('Pre-Owned (USED)'));
});

test('store search term keeps literal spelling', () => {
  assert.equal(storeSearchTerm('Spider-Man 2 PS5'), 'Spider-Man 2');
  assert.equal(storeSearchTerm('EA FC 25'), 'FC 25');
  assert.equal(storeSearchTerm("Marvel's Spider-Man 2"), 'Spider-Man 2');
});

test('Best deals: new + in stock only, one card per game, biggest % first', async () => {
  const { topDeals } = await import('../src/matching/deals.js');
  const base = { condition: 'new', inStock: true, edition: 'Standard', fetchedAt: 't' };
  const d = topDeals([
    { ...base, store: 'a', title: 'Astro Bot', url: '1', price: 3000, mrp: 4000, discountPct: 25 },
    { ...base, store: 'b', title: 'Astro Bot PS5', url: '2', price: 2000, mrp: 4000, discountPct: 50 },
    { ...base, store: 'a', title: 'Gran Turismo 7', url: '3', price: 1000, mrp: 4000, discountPct: 75, condition: 'preowned' },
    { ...base, store: 'a', title: 'Returnal', url: '4', price: 1000, mrp: 3000, discountPct: 67, inStock: false },
    { ...base, store: 'a', title: 'Ghost of Yotei', url: '5', price: 4000, mrp: 4999, discountPct: 20 },
    { ...base, store: 'a', title: 'Odd listing', url: '6', price: 10, mrp: 4999, discountPct: 100 },
  ]);
  assert.deepEqual(d.map((x) => [x.title, x.store, x.discountPct]), [['Astro Bot', 'b', 50], ['Ghost of Yotei', 'a', 20]]);
});
