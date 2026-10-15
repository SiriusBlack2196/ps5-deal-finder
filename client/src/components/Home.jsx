import { useEffect, useState } from 'react';
import SearchBox from './SearchBox.jsx';
import { Wordmark } from './ui.jsx';
import { Shelf, TagTitle } from './Shelf.jsx';
import { getShelf, getStores, getDeals, getLatest } from '../lib/api.js';
import { inr } from '../lib/format.js';

const listNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
const fmtDay = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  const year = d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {};
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...year });
};

export default function Home({ onSearch }) {
  const [stores, setStores] = useState([]);
  const [popular, setPopular] = useState(null);
  const [deals, setDeals] = useState(null);
  const [tab, setTab] = useState('released');
  const [latest, setLatest] = useState({});

  useEffect(() => {
    getStores().then(setStores).catch(() => {});
    getShelf().then(setPopular).catch(() => setPopular([]));
    getDeals().then(setDeals).catch(() => setDeals([]));
  }, []);
  useEffect(() => {
    if (latest[tab]) return;
    getLatest(tab).then((g) => setLatest((m) => ({ ...m, [tab]: g }))).catch(() => setLatest((m) => ({ ...m, [tab]: [] })));
  }, [tab, latest]);

  const name = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  const pick = (it) => onSearch(it.title);
  const releases = latest[tab];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[75rem] items-center px-4 sm:h-20 sm:px-8">
        <Wordmark />
      </header>

      <section className="mx-auto grid max-w-[75rem] gap-8 px-4 pb-14 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:gap-16 lg:pb-20">
        <div>
          <h1 className="spine max-w-[14ch] text-[2.6rem] text-paper sm:text-[3.75rem]">The lowest price on any PS5 disc in India</h1>
          {stores.length > 0 && (
            <p className="mt-5 max-w-[56ch] text-[0.98rem] leading-relaxed text-dim">
              New and pre-owned copies from {listNames(stores.map((s) => s.name))}, side by side.
            </p>
          )}
        </div>
        <div className="min-w-0"><SearchBox onSearch={onSearch} autoFocus /></div>
      </section>

      <main className="mx-auto max-w-[75rem] space-y-16 px-4 pb-20 sm:space-y-20 sm:px-8">
        {(popular === null || popular.length > 0) && (
          <ShelfSection id="popular" title="Popular right now">
            <Shelf
              label="Popular right now" loading={popular === null} onPick={pick}
              items={(popular || []).slice(0, 6).map((g) => ({ ...g, key: g.title }))}
              renderTag={(g) => (
                <>
                  <TagTitle>{g.title}</TagTitle>
                  <span className="mt-1.5 flex items-baseline gap-1 text-ink">
                    {g.price ? <><span className="text-[0.75rem] text-ink-2">from</span><span className="price text-[1.1rem]">{inr(g.price)}</span></> : <span className="text-[0.8rem] text-ink-2">Out of stock</span>}
                  </span>
                  <span className="mt-0.5 block text-[0.72rem] text-ink-2">{g.storeCount} {g.storeCount === 1 ? 'store' : 'stores'}</span>
                </>
              )}
            />
          </ShelfSection>
        )}

        {(deals === null || deals.length > 0) && (
          <ShelfSection id="deals" title="Price drops" note="Recent games, new copies, the biggest cuts off each store's MRP">
            <Shelf
              label="Price drops" loading={deals === null} onPick={pick}
              items={(deals || []).slice(0, 12).map((d) => ({ ...d, key: d.gameKey }))}
              renderTag={(d) => (
                <>
                  <TagTitle>{d.title}</TagTitle>
                  <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="price text-[1.1rem] text-ink"><span className="sr-only">now </span>{inr(d.price)}</span>
                    <s className="text-[0.75rem] text-ink-2 [font-variant-numeric:tabular-nums]"><span className="sr-only">MRP </span>{inr(d.mrp)}</s>
                  </span>
                  <span className="mt-0.5 block text-[0.75rem] font-semibold text-save-ink">{d.discountPct}% off</span>
                  <span className="block truncate text-[0.72rem] text-ink-2">{name[d.store] || d.store}</span>
                </>
              )}
            />
          </ShelfSection>
        )}

        <ShelfSection
          id="latest" title={tab === 'released' ? 'New releases' : 'Coming soon'}
          aside={<Toggle value={tab} onChange={setTab} options={[['released', 'Out now'], ['upcoming', 'Coming soon']]} />}
        >
          {releases && releases.length === 0 ? (
            <p className="text-dim">No pre-orders listed right now.</p>
          ) : (
            <Shelf
              label={tab === 'released' ? 'New releases' : 'Coming soon'} loading={!releases} onPick={pick}
              items={(releases || []).slice(0, 6).map((g) => ({ ...g, key: g.gameKey }))}
              renderTag={(g) => (
                <>
                  <TagTitle>{g.title}</TagTitle>
                  <span className="mt-1.5 flex items-baseline gap-1 text-ink">
                    <span className="text-[0.75rem] text-ink-2">from</span><span className="price text-[1.1rem]">{inr(g.price)}</span>
                  </span>
                  <span className="mt-0.5 block text-[0.72rem] text-ink-2">
                    {g.date ? `${tab === 'upcoming' ? 'Out' : 'Released'} ${fmtDay(g.date)}` : 'Pre-order'}
                  </span>
                </>
              )}
            />
          )}
        </ShelfSection>
      </main>

      <footer className="border-t border-edge">
        <p className="mx-auto max-w-[75rem] px-4 py-8 text-[0.85rem] leading-relaxed text-dim sm:px-8">
          Prices come from each store's public listings and can change. Check the final price at checkout.
          Lowscore is not affiliated with Sony Interactive Entertainment.
        </p>
      </footer>
    </div>
  );
}

function ShelfSection({ id, title, note, aside, children }) {
  return (
    <section aria-labelledby={`${id}-h`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id={`${id}-h`} className="spine text-[1.75rem] text-paper sm:text-[2.1rem]">{title}</h2>
          {note && <p className="mt-1.5 text-[0.9rem] text-dim">{note}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Toggle({ value, onChange, options }) {
  return (
    <div role="tablist" aria-label="Release window" className="flex rounded-box p-0.5 shadow-[inset_0_0_0_1px_var(--color-edge-hi)]">
      {options.map(([v, text]) => (
        <button
          key={v} role="tab" type="button" aria-selected={value === v} onClick={() => onChange(v)}
          className={`h-8 rounded-[4px] px-3 text-[0.85rem] font-semibold transition-colors ${value === v ? 'bg-paper text-ink' : 'text-paper-2 hover:text-paper'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
