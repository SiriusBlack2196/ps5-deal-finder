import { useEffect, useState } from 'react';
import SearchBox from './SearchBox.jsx';
import { Wordmark } from './ui.jsx';
import { StoreBadge } from './StoreRow.jsx';
import { getPopular, getStores, getSnapshotInfo } from '../lib/api.js';
import { Thumb } from '../lib/thumbs.jsx';
import BestDeals from './BestDeals.jsx';

export default function Home({ onSearch }) {
  const [popular, setPopular] = useState([]);
  const [stores, setStores] = useState([]);
  const [snap, setSnap] = useState(null);

  useEffect(() => {
    getPopular().then(setPopular).catch(() => {});
    getStores().then(setStores).catch(() => {});
    getSnapshotInfo().then(setSnap).catch(() => {});
  }, []);

  const checked = stores.filter((s) => !snap || snap.stores.find((x) => x.id === s.id)?.status === 'ok');

  return (
    <div className="min-h-dvh bg-ground">
      <header className="bg-white shadow-[0_1px_0_var(--color-line)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <section className="ps-band">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-14 text-center sm:px-8 sm:pb-20 sm:pt-20">
          <h1 className="display text-[2.5rem] sm:text-[3.5rem]">Find the lowest price for any PS5 game</h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-lg text-white/80">
            Compare new and pre-owned discs across Indian game stores in one search.
          </p>
          <div className="mx-auto mt-9 max-w-2xl text-left">
            <SearchBox onSearch={onSearch} autoFocus />
          </div>
          {checked.length > 0 && (
            <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Stores checked">
              {checked.map((s) => (
                <li key={s.id} className="inline-flex h-8 items-center gap-2 rounded-full bg-white/10 pl-1 pr-3.5 text-sm text-white">
                  <StoreBadge id={s.id} name={s.name} size="sm" />{s.name}
                </li>
              ))}
              <li className="inline-flex h-8 items-center rounded-full px-3.5 text-sm text-white/60">Amazon and Flipkart coming next</li>
            </ul>
          )}
        </div>
      </section>

      {popular.length > 0 && (
        <section aria-labelledby="popular-h" className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
          <h2 id="popular-h" className="display text-[2rem] sm:text-[2.6rem]">Popular right now</h2>
          {/* 3 x 3 on tablet and up, a single ruled list on phones. Every cell draws its own
              bottom/right rule; the list is pulled 1px under the frame's edge so the outer rules hide. */}
          <div className="mt-6 overflow-hidden rounded-card bg-white shadow-[0_0_0_1px_var(--color-line)]">
            <ul className="-mb-px -mr-px grid grid-cols-1 md:grid-cols-3">
              {popular.map((g) => (
              <li key={g} className="border-b border-r border-line">
                <button onClick={() => onSearch(g)} className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ground sm:px-5 sm:py-5 md:gap-3 md:px-4">
                  <Thumb title={g} className="h-20 w-[3.75rem] shrink-0 rounded-box sm:h-24 sm:w-[4.5rem] md:h-20 md:w-[3.75rem]" />
                  <span className="min-w-0 flex-1 text-[1.05rem] font-semibold leading-snug group-hover:text-blue">{g}</span>
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip md:size-8 text-ink transition-colors duration-200 group-hover:bg-blue group-hover:text-white">
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                  </span>
                </button>
              </li>
            ))}
            </ul>
          </div>
        </section>
      )}

      <BestDeals onSearch={onSearch} />

      <footer className="bg-white shadow-[0_-1px_0_var(--color-line)]">
        <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-8">
          Prices come from each store's public listings and can change. Check the final price at checkout.
          Lowscore is not affiliated with Sony Interactive Entertainment.
        </p>
      </footer>
    </div>
  );
}
