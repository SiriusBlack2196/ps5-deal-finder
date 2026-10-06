// Wide key art used as the results-page backdrop, keyed like thumbnails.
//  - artifact build: heroes.json (data URIs, popular + deal titles) next to the page
//  - live app: /api/heroes map + /heroes/<file> served by the API
import { useEffect, useState } from 'react';
import { SNAPSHOT } from './api.js';
import { thumbKey } from './thumbs.jsx';
import { tokenize, displayTitle } from '@matching/normalize.js';

const EDITION = new Set(['standard', 'deluxe', 'ultimate', 'gold', 'premium', 'launch', 'day', 'one', 'complete',
  'definitive', 'special', 'limited', 'collector', 'collectors', 'anniversary', 'goty', 'edition', 'ed', 'bundle']);

let mapPromise = null;
const loadMap = () => (mapPromise ??= (SNAPSHOT
  ? fetch('heroes.json').then((r) => (r.ok ? r.json() : {}))
  : fetch('/api/heroes').then((r) => (r.ok ? r.json() : {})).then((m) =>
      Object.fromEntries(Object.entries(m).map(([k, f]) => [k, `/heroes/${f}`])))
).catch(() => ({})));

export function useHero(title) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    const key = thumbKey(title);
    if (!key) return;
    const base = tokenize(displayTitle(title)).filter((t) => !EDITION.has(t)).join(' ');
    loadMap().then((m) => {
      const url = m[key] || m[base];
      if (!url || !alive) return;
      const img = new Image();               // only swap in once decoded, so it fades in cleanly
      img.onload = () => alive && setSrc(url);
      img.src = url;
    });
    return () => { alive = false; };
  }, [title]);
  return src;
}
