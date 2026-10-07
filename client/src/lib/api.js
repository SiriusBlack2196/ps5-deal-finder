// One data layer, two backends:
//  - live (default): the Express API, prices fetched from stores per search
//  - snapshot (VITE_SNAPSHOT=1): a bundled price snapshot searched in the browser
//    with the server's own matching code, used for the claude.ai artifact build.

import { useEffect, useState } from 'react';
import { useSearchStream } from './useSearchStream.js';

export const SNAPSHOT = import.meta.env.VITE_SNAPSHOT === '1';

let snapMod = null;
const loadSnapshot = () => (snapMod ??= import('./snapshotBackend.js'));

export async function getStores() {
  if (SNAPSHOT) return (await loadSnapshot()).getStores();
  const r = await fetch('/api/stores');
  return r.json();
}

export async function getPopular() {
  if (SNAPSHOT) return (await loadSnapshot()).getPopular();
  const r = await fetch('/api/popular');
  return r.json();
}

export async function getLatest(mode = 'released') {
  if (SNAPSHOT) return (await loadSnapshot()).getLatest(mode);
  const r = await fetch(`/api/latest?mode=${mode}`);
  return r.ok ? r.json() : [];
}

export async function getDeals() {
  if (SNAPSHOT) return (await loadSnapshot()).getDeals();
  const r = await fetch('/api/deals');
  return r.ok ? r.json() : [];
}

export async function suggest(q, signal) {
  if (SNAPSHOT) return (await loadSnapshot()).suggest(q);
  const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal });
  return r.ok ? r.json() : [];
}

export async function getSnapshotInfo() {
  return SNAPSHOT ? (await loadSnapshot()).info() : null;
}

function useSnapshotSearch(query) {
  const [state, setState] = useState({ stores: [], byStore: {}, finished: false, error: null });
  useEffect(() => {
    let alive = true;
    if (!query) { setState({ stores: [], byStore: {}, finished: false, error: null }); return; }
    loadSnapshot().then((m) => { if (alive) setState(m.search(query)); });
    return () => { alive = false; };
  }, [query]);
  return state;
}

export const useSearch = SNAPSHOT ? useSnapshotSearch : useSearchStream;
