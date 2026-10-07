// Square store art for the "Latest releases" tiles, keyed like thumbnails.
//  - artifact build: tiles.json (data URIs, the titles the section shows) next to the page
//  - live app: /api/tiles map + /tiles/<file> served by the API
import { useEffect, useState } from 'react';
import { SNAPSHOT } from './api.js';

let mapPromise = null;
export const loadTiles = () => (mapPromise ??= (SNAPSHOT
  ? fetch('tiles.json').then((r) => (r.ok ? r.json() : {}))
  : fetch('/api/tiles').then((r) => (r.ok ? r.json() : {})).then((m) =>
      Object.fromEntries(Object.entries(m).map(([k, f]) => [k, `/tiles/${f}`])))
).catch(() => ({})));

/** The whole map once loaded ({} until then), so a grid does one lookup per tile. */
export function useTiles() {
  const [map, setMap] = useState({});
  useEffect(() => { loadTiles().then(setMap); }, []);
  return map;
}
