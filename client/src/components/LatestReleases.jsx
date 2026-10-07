// Home: the 9 most recently released games the stores carry, in the same ruled
// 3 x 3 grid as "Popular right now", with release date and the lowest price.
import { useEffect, useState } from 'react';
import { getLatest } from '../lib/api.js';
import { Thumb } from '../lib/thumbs.jsx';
import { inr } from '../lib/format.js';

const fmtDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function LatestReleases({ onSearch }) {
  const [games, setGames] = useState([]);
  useEffect(() => { getLatest().then(setGames).catch(() => {}); }, []);
  if (!games.length) return null;
  return (
    <section aria-labelledby="latest-h" className="mx-auto max-w-6xl px-4 pb-12 sm:px-8 sm:pb-16">
      <h2 id="latest-h" className="display text-[2rem] sm:text-[2.6rem]">Latest releases</h2>
      <div className="mt-6 overflow-hidden rounded-card bg-white shadow-[0_0_0_1px_var(--color-line)]">
        <ul className="-mb-px -mr-px grid grid-cols-1 md:grid-cols-3">
          {games.map((g) => (
            <li key={g.gameKey} className="border-b border-r border-line">
              <button onClick={() => onSearch(g.title)} className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ground sm:px-5 sm:py-5 md:gap-3 md:px-4">
                <Thumb title={g.title} className="h-20 w-[3.75rem] shrink-0 rounded-box sm:h-24 sm:w-[4.5rem] md:h-20 md:w-[3.75rem]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.05rem] font-semibold leading-snug group-hover:text-blue">{g.title}</span>
                  <span className="mt-1 block text-sm text-muted">
                    Released {fmtDate(g.date)}
                  </span>
                  <span className="mt-0.5 block text-sm">
                    {g.inStock ? <>from <span className="font-bold text-ink">{inr(g.price)}</span></> : <span className="text-muted">Out of stock</span>}
                  </span>
                </span>
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip text-ink transition-colors duration-200 group-hover:bg-blue group-hover:text-white md:size-8">
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
