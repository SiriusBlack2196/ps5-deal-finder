import { useEffect, useState } from 'react';
import SearchBox from './SearchBox.jsx';
import { Dot, Wordmark } from './ui.jsx';
import { getPopular, getStores, getSnapshotInfo } from '../lib/api.js';
import SnapshotNote from './SnapshotNote.jsx';
import { Thumb } from '../lib/thumbs.jsx';

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
                <li key={s.id} className="inline-flex h-8 items-center gap-2 rounded-full bg-white/10 px-3.5 text-sm text-white">
                  <Dot tone="light" />{s.name}
                </li>
              ))}
              <li className="inline-flex h-8 items-center rounded-full px-3.5 text-sm text-white/60">Amazon and Flipkart coming next</li>
            </ul>
          )}
          {snap && <SnapshotNote info={snap} className="mx-auto mt-6 max-w-md justify-center text-left" />}
        </div>
      </section>

      {popular.length > 0 && (
        <section aria-labelledby="popular-h" className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
          <h2 id="popular-h" className="display text-[2rem] sm:text-[2.6rem]">Popular right now</h2>
          <ul className="mt-6 grid grid-cols-1 overflow-hidden rounded-card bg-white shadow-[0_0_0_1px_var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((g) => (
              <li
                key={g}
                className="border-line [&:not(:last-child)]:border-b sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r lg:[&:nth-last-child(-n+4)]:border-b-0 lg:[&:not(:nth-child(4n))]:border-r lg:[&:nth-child(4n)]:border-r-0"
              >
                <button onClick={() => onSearch(g)} className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ground sm:px-5 sm:py-5 lg:gap-3 lg:px-4">
                  <Thumb title={g} className="h-20 w-[3.75rem] shrink-0 rounded-box sm:h-24 sm:w-[4.5rem] lg:h-20 lg:w-[3.75rem]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.05rem] font-semibold leading-snug group-hover:text-blue">{g}</span>
                    <span className="mt-0.5 block whitespace-nowrap text-sm text-muted">Compare prices</span>
                  </span>
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip lg:size-8 text-ink transition-colors duration-200 group-hover:bg-blue group-hover:text-white">
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="bg-white shadow-[0_-1px_0_var(--color-line)]">
        <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-8">
          Prices come from each store's public listings and can change. Check the final price at checkout.
          PS5 Deal Finder is not affiliated with Sony Interactive Entertainment.
        </p>
      </footer>
    </div>
  );
}
