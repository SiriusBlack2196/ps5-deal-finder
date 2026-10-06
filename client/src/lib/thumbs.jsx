// Game cover thumbnails, keyed by normalized game title. Two sizes:
//  - sm (180px): lists, autocomplete
//  - lg (up to 520px): deal cards and the results header, sharp on 2x screens
// Sources:
//  - artifact build: thumbs.json / thumbs-lg.json (data URIs) published next to the page;
//    thumbs-lg.json only covers the deal and popular titles to keep the page small
//  - live app: /api/thumbs map + /thumbs/<file> and /thumbs/lg/<file> served by the API
// A large cover that's missing falls back to the small one, then to a placeholder.

import { useEffect, useState } from 'react';
import { tokenize, displayTitle } from '@matching/normalize.js';
import { SNAPSHOT } from './api.js';

const getJSON = (u) => fetch(u).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const maps = {};
function loadMap(size) {
  if (maps[size]) return maps[size];
  if (SNAPSHOT) maps[size] = getJSON(size === 'lg' ? 'thumbs-lg.json' : 'thumbs.json');
  else {
    const dir = size === 'lg' ? '/thumbs/lg/' : '/thumbs/';
    maps[size] = getJSON('/api/thumbs').then((m) => Object.fromEntries(Object.entries(m).map(([k, f]) => [k, dir + f])));
  }
  return maps[size];
}

export const thumbKey = (title) => tokenize(displayTitle(title || '')).join(' ');

/** Candidate sources, best first (size 'lg' -> [large, small]). */
export function useThumbs(title, size = 'sm') {
  const [srcs, setSrcs] = useState([]);
  useEffect(() => {
    let alive = true;
    const key = thumbKey(title);
    if (!key) { setSrcs([]); return; }
    const sizes = size === 'lg' ? ['lg', 'sm'] : ['sm'];
    Promise.all(sizes.map(loadMap)).then((ms) => {
      if (alive) setSrcs([...new Set(ms.map((m) => m[key]).filter(Boolean))]);
    });
    return () => { alive = false; };
  }, [title, size]);
  return srcs;
}

export function useThumb(title, size = 'sm') {
  return useThumbs(title, size)[0] || null;
}

/**
 * fit 'cover' crops to the box (small list thumbnails);
 * fit 'contain' shows the whole cover at its own shape, centred in the box.
 */
export function Thumb({ title, className = '', fallback = 'light', size = 'sm', fit = 'cover', imgClassName = '' }) {
  const srcs = useThumbs(title, size);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [srcs]);
  const src = srcs[idx];
  const bg = fallback === 'dark' ? 'bg-white/10' : 'bg-chip';
  const onError = () => setIdx((i) => i + 1);
  if (!src) {
    return (
      <span aria-hidden="true" className={`flex items-center justify-center ${bg} ${className}`}>
        <svg viewBox="0 0 24 24" className="size-1/3 max-h-6 max-w-6 text-line" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
      </span>
    );
  }
  if (fit === 'contain') {
    return (
      <span className={`flex items-center justify-center ${className}`}>
        <img src={src} alt="" loading="lazy" decoding="async" onError={onError} className={`h-auto max-h-full w-auto max-w-full ${imgClassName}`} />
      </span>
    );
  }
  return <img src={src} alt="" loading="lazy" decoding="async" onError={onError} className={`object-cover ${bg} ${className}`} />;
}
