import { useEffect, useState } from 'react';
import { getLatest } from '../lib/api.js';
import { Thumb, thumbKey } from '../lib/thumbs.jsx';
import { useTiles } from '../lib/tiles.js';
import { inr } from '../lib/format.js';

const TABS = [
  { id: 'released', label: 'New releases' },
  { id: 'upcoming', label: 'Coming soon' },
];

// "8 Oct" this year, "15 Jan 2027" beyond it.
const fmtDay = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  const year = d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {};
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...year });
};

// Dark full-bleed band in the style of PlayStation.com's "out now or coming soon" grid:
// centred heading, a two-way pill toggle, then square store-art tiles (cover crop as fallback).
export default function LatestReleases({ onSearch }) {
  const [tab, setTab] = useState('released');
  const [lists, setLists] = useState({});
  const tiles = useTiles();

  useEffect(() => {
    if (lists[tab]) return;
    let alive = true;
    getLatest(tab).then((g) => alive && setLists((m) => ({ ...m, [tab]: g }))).catch(() => {});
    return () => { alive = false; };
  }, [tab, lists]);

  const games = lists[tab];
  if (tab === 'released' && games && !games.length) return null;

  return (
    <section aria-labelledby="latest-h" className="bg-[#121314] py-14 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <h2 id="latest-h" className="display text-center text-[2rem] text-white sm:text-[2.6rem]">Latest releases</h2>

        <div role="tablist" aria-label="Release window" className="mt-6 flex justify-center">
          <div className="inline-flex rounded-full bg-white/[0.08] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls="latest-grid"
                onClick={() => setTab(t.id)}
                className={`h-10 rounded-full px-5 text-[0.95rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
                  tab === t.id ? 'bg-white text-ink' : 'text-white/80 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <ul id="latest-grid" role="tabpanel" className="mt-10 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-6">
          {games
            ? games.map((g) => <Tile key={g.gameKey} g={g} art={tiles[thumbKey(g.title)] || tiles[g.gameKey]} upcoming={tab === 'upcoming'} onSearch={onSearch} />)
            : Array.from({ length: 6 }, (_, i) => (
                <li key={i}><span className="block aspect-square rounded-xl bg-white/[0.06]" /><span className="mt-3 block h-4 w-3/4 rounded bg-white/[0.06]" /></li>
              ))}
        </ul>
        {games && !games.length && <p className="mt-2 text-center text-white/60">Nothing up for pre-order right now.</p>}
      </div>
    </section>
  );
}

function Tile({ g, art, upcoming, onSearch }) {
  const when = upcoming ? (g.date ? `Out ${fmtDay(g.date)}` : 'Pre-order') : null;
  return (
    <li>
      <button type="button" onClick={() => onSearch(g.title)} className="group block w-full text-left focus-visible:outline-none">
        <span className="relative block aspect-square overflow-hidden rounded-xl bg-white/[0.06] ring-blue ring-offset-2 ring-offset-[#121314] group-focus-visible:ring-2">
          {art ? (
            <img src={art} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]" />
          ) : (
            /* No square art yet: zoom the cover past its PS5 banner and age-rating corner. */
            <Thumb title={g.title} size="lg" fallback="dark" className="size-full scale-[1.16] object-center transition-transform duration-300 ease-out group-hover:scale-[1.2]" />
          )}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[0.68rem] font-bold leading-none tracking-wide text-white">PS5</span>
        </span>
        <span className="mt-3 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-white/90 group-hover:text-white">{g.title}</span>
        <span className="mt-1 block text-sm text-white/55">from {inr(g.price)}</span>
        {when && <span className="block text-sm text-white/55">{when}</span>}
      </button>
    </li>
  );
}
