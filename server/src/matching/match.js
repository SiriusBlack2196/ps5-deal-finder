// Decides whether a listing is the game the user searched for.
//
// Rules (in order):
//  1. Every query token must appear in the title (typo-tolerant for long words;
//     "spider man" and "spiderman" are treated as the same).
//  2. Numbers are exact: "FC 25" never matches "FC 26"; "Spider-Man 2" never
//     matches "Spider-Man (2018)".
//  3. Title tokens left over after covering the query are "extra". No extras =>
//     'exact' match. Extras => 'related' (e.g. query "god of war" vs title
//     "god of war ragnarok"), shown as a "did you mean" option, never mixed in.

import { tokenize, gameKey } from './normalize.js';

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const isNum = (t) => /^\d+$/.test(t);

function tokenEq(q, t) {
  if (q === t) return true;
  if (isNum(q) || isNum(t)) return false;
  const tol = q.length >= 8 ? 2 : q.length >= 5 ? 1 : 0;
  return tol > 0 && lev(q, t) <= tol;
}

/**
 * Greedy cover of query tokens by title tokens. Handles split/joined words by
 * also trying adjacent pairs ("spider"+"man" == "spiderman").
 * Returns { covered: boolean, extras: string[] }
 */
function cover(qTokens, tTokens) {
  const used = new Array(tTokens.length).fill(false);
  let qi = 0;
  const qs = [...qTokens];
  while (qi < qs.length) {
    const q = qs[qi];
    let found = -1, span = 1;
    for (let i = 0; i < tTokens.length && found < 0; i++) {
      if (used[i]) continue;
      if (tokenEq(q, tTokens[i])) { found = i; span = 1; }
      else if (i + 1 < tTokens.length && !used[i + 1] && tokenEq(q, tTokens[i] + tTokens[i + 1])) { found = i; span = 2; }
    }
    if (found < 0 && qi + 1 < qs.length) {
      // query split, title joined: "spider man" vs "spiderman"
      const joined = q + qs[qi + 1];
      for (let i = 0; i < tTokens.length; i++) {
        if (!used[i] && tokenEq(joined, tTokens[i])) { used[i] = true; qi += 2; found = -2; break; }
      }
      if (found === -2) continue;
    }
    if (found < 0) return { covered: false, extras: [] };
    for (let k = 0; k < span; k++) used[found + k] = true;
    qi++;
  }
  return { covered: true, extras: tTokens.filter((_, i) => !used[i]) };
}

export function prepareQuery(query) {
  const tokens = tokenize(query);
  return { raw: query, tokens, key: gameKey(tokens) };
}

/**
 * @returns {null | { matchType: 'exact'|'related', score: number, gameKey: string }}
 */
export function matchTitle(preparedQuery, title) {
  const q = preparedQuery.tokens;
  const t = tokenize(title);
  if (q.length === 0 || t.length === 0) return null;
  const { covered, extras } = cover(q, t);
  if (!covered) return null;
  const score = q.length / (q.length + extras.length);
  return {
    matchType: extras.length === 0 ? 'exact' : 'related',
    score,
    gameKey: gameKey(t),
  };
}

/** Light pre-filter adapters use to avoid fetching obviously irrelevant products. */
export function couldMatch(preparedQuery, title) {
  return matchTitle(preparedQuery, title) !== null;
}
