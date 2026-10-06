// Game cover thumbnails, keyed by normalized game title.
//  - artifact build: thumbs.json (data URIs) published next to the page
//  - live app: /api/thumbs map + /thumbs/<file>.webp served by the API
// Missing covers resolve to null and the UI shows a placeholder.

import { useEffect, useState } from 'react';
import { tokenize, displayTitle } from '@matching/normalize.js';
import { SNAPSHOT } from './api.js';

let mapPromise = null;
function loadMap() {
  mapPromise ??= (SNAPSHOT
    ? fetch('thumbs.json').then((r) => (r.ok ? r.json() : {}))
    : fetch('/api/thumbs').then((r) => (r.ok ? r.json() : {})).then((m) =>
        Object.fromEntries(Object.entries(m).map(([k, f]) => [k, `/thumbs/${f}`])))
  ).catch(() => ({}));
  return mapPromise;
}

export const thumbKey = (title) => tokenize(displayTitle(title || '')).join(' ');

export function useThumb(title) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    const key = thumbKey(title);
    if (!key) { setSrc(null); return; }
    loadMap().then((m) => { if (alive) setSrc(m[key] || null); });
    return () => { alive = false; };
  }, [title]);
  return src;
}

export function Thumb({ title, className = '', fallback = 'light' }) {
  const src = useThumb(title);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const bg = fallback === 'dark' ? 'bg-white/10' : 'bg-chip';
  if (!src || failed) {
    return (
      <span aria-hidden="true" className={`flex items-center justify-center ${bg} ${className}`}>
        <svg viewBox="0 0 24 24" className="size-1/3 max-h-6 max-w-6 text-line" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
      </span>
    );
  }
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${bg} ${className}`} />;
}
