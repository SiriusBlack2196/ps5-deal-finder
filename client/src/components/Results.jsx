import { useMemo, useState, useEffect } from 'react';
import SearchBox from './SearchBox.jsx';
import { ListingRow, SkeletonRow, StoreNotice } from './StoreRow.jsx';
import { useSearch, getSnapshotInfo } from '../lib/api.js';
import SnapshotNote from './SnapshotNote.jsx';
import { useThumb } from '../lib/thumbs.jsx';
import { pickGame, applyFilters, bestDeals, priceSpread, editionsIn } from '../lib/derive.js';
import { inr } from '../lib/format.js';
import { Arrow, ArrowButton, Marker } from './ui.jsx';

const DEFAULT_FILTERS = { condition: 'all', inStockOnly: true, edition: 'all' };

export default function Results({ query, onSearch, onHome }) {
  const { stores, byStore, finished, error } = useSearch(query);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [snap, setSnap] = useState(null);
  useEffect(() => { getSnapshotInfo().then(setSnap).catch(() => {}); }, []);
  useEffect(() => setFilters(DEFAULT_FILTERS), [query]);

  const storeName = (id) => stores.find((s) => s.id === id)?.name || id;
  const game = useMemo(() => pickGame(byStore, finished), [byStore, finished]);
  const visible = useMemo(() => applyFilters(game.listings, filters), [game.listings, filters]);
  const { bestNew, bestUsed } = useMemo(() => bestDeals(game.listings, filters), [game.listings, filters]);
  const spread = useMemo(() => priceSpread(visible), [visible]);
  const editions = useMemo(() => editionsIn(game.listings), [game.listings]);

  const pending = stores.filter((s) => byStore[s.id]?.status === 'pending');
  const failed = stores.filter((s) => byStore[s.id]?.status === 'error');
  const okStores = stores.filter((s) => byStore[s.id]?.status === 'ok');
  const storesWithGame = new Set(game.listings.map((l) => l.store));
  const storesVisible = new Set(visible.map((l) => l.store));
  const missing = okStores.filter((s) => !storesWithGame.has(s.id));
  const hiddenByFilters = okStores.filter((s) => storesWithGame.has(s.id) && !storesVisible.has(s.id));

  const heroTitle = game.fallbackTitle || pickTitle(game.listings, query) || query;
  const cachedThumb = useThumb(game.listings.length ? heroTitle : null);
  const heroImage = (bestNew || bestUsed || game.listings[0])?.imageUrl || cachedThumb;
  const nothingAnywhere = finished && game.listings.length === 0;

  const doneCount = stores.length - pending.length;
  const pct = stores.length ? Math.round((doneCount / stores.length) * 100) : 0;

  return (
    <div className="min-h-dvh bg-white">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 bg-black pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 sm:px-10">
          <button onClick={onHome} aria-label="Back to home" className="flex h-11 shrink-0 items-center gap-2.5 pr-1">
            <Marker />
            <span className="hidden text-[0.95rem] sm:inline">PS5 Deal Finder</span>
          </button>
          <div className="min-w-0 flex-1 sm:max-w-xl"><SearchBox initial={query} onSearch={onSearch} size="sm" /></div>
        </div>
      </div>

      <section className="glow relative overflow-hidden text-white">
        <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-10 sm:pb-14 sm:pt-12">
          {error && <p role="alert" className="mb-6 border border-alert p-4 text-alert">{error}</p>}

          <header className="flex items-end gap-5">
            <Cover src={heroImage} loading={!finished} />
            <div className="min-w-0 flex-1">
              <h1 className="display text-[2.4rem] sm:text-[4rem]">{nothingAnywhere ? query : heroTitle}</h1>
              {game.fallbackTitle && <p className="mt-2 text-sm text-grey-400">No exact match for “{query}”. Showing the closest game.</p>}
            </div>
          </header>

          <div className="mt-7" aria-live="polite">
            <div className="meta flex justify-between text-grey-400">
              <span>
                {finished
                  ? `${game.listings.length} ${game.listings.length === 1 ? 'listing' : 'listings'} from ${storesWithGame.size} of ${stores.length} stores`
                  : `Checking stores ${doneCount}/${stores.length || '…'}`}
              </span>
              <span className="text-white">{pct}%</span>
            </div>
            <div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
          {snap && <SnapshotNote info={snap} className="mt-4" compact />}

          {(bestNew || bestUsed) && (
            <section aria-label="Best prices" className={`mt-8 grid gap-px bg-grey-700 ${bestNew && bestUsed ? 'grid-cols-2' : 'grid-cols-1 sm:max-w-md'}`}>
              {bestNew && <DealBlock kind="new" l={bestNew} storeName={storeName(bestNew.store)} />}
              {bestUsed && <DealBlock kind="used" l={bestUsed} storeName={storeName(bestUsed.store)} />}
            </section>
          )}
          {finished && !bestNew && game.listings.length > 0 && (
            <p className="mt-8 border border-grey-700 p-4 text-sm text-grey-400">
              No store has a new copy in stock right now.{bestUsed ? '' : ' Turn off “In stock only” to see out-of-stock listings.'}
            </p>
          )}
        </div>
      </section>

      <section className="text-black">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-10">
          {nothingAnywhere && (
            <EmptyState query={query} related={game.related} onSearch={onSearch} failedCount={failed.length} total={stores.length} />
          )}

          {spread && spread.save > 0 && (
            <p className="text-lg">
              Save <span className="text-blue">{inr(spread.save)}</span> vs the highest {spread.condition === 'preowned' ? 'pre-owned ' : ''}price
              <span className="text-grey-600"> across {spread.count} stores</span>
            </p>
          )}

          {game.listings.length > 0 && (
            <Filters filters={filters} setFilters={setFilters} editions={editions} />
          )}

          <ul className="mt-4" aria-busy={!finished}>
            <li aria-hidden="true" className="dots-x" />
            {visible.map((l) => (
              <ListingRow
                key={l.url}
                l={l}
                storeName={storeName(l.store)}
                highlight={l === bestNew ? 'new' : l === bestUsed ? 'used' : null}
              />
            ))}
            {pending.map((s) => <SkeletonRow key={s.id} storeId={s.id} storeName={s.name} />)}
            {hiddenByFilters.map((s) => (
              <StoreNotice
                key={s.id} storeId={s.id} storeName={s.name} kind="hidden"
                count={game.listings.filter((l) => l.store === s.id).length}
                onShowAll={() => setFilters({ ...DEFAULT_FILTERS, inStockOnly: false })}
              />
            ))}
            {finished && !nothingAnywhere && missing.map((s) => (
              <StoreNotice key={s.id} storeId={s.id} storeName={s.name} kind="missing" />
            ))}
            {failed.map((s) => (
              <StoreNotice key={s.id} storeId={s.id} storeName={s.name} kind="error" detail={byStore[s.id].error} />
            ))}
          </ul>

          {!nothingAnywhere && finished && game.related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg">Looking for a different game?</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {game.related.slice(0, 5).map((g) => (
                  <ArrowButton key={g.key} tone="outline" size="sm" onClick={() => onSearch(g.title)}>{g.title}</ArrowButton>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function DealBlock({ kind, l, storeName }) {
  const isNew = kind === 'new';
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group flex flex-col justify-between ${isNew ? 'bg-blue' : 'bg-surface'} p-4 sm:p-6`}
    >
      <div>
        <p className="meta flex items-center gap-2">
          <Marker tone={isNew ? 'dark' : 'orange'} />
          {isNew ? 'Best deal' : 'Best pre-owned'}
        </p>
        <div className={`dots-x mt-3 ${isNew ? '[--line:rgba(255,255,255,0.45)]' : 'on-dark'}`} />
        <p className="price mt-4 text-[2.3rem] leading-none sm:text-[3.5rem]">{inr(l.effectivePrice)}</p>
        <p className="mt-3 text-[0.95rem] leading-snug">{storeName}</p>
        <p className={`text-sm ${isNew ? 'text-white/75' : 'text-grey-400'}`}>
          {l.edition === 'Standard' ? (isNew ? 'New copy' : 'Pre-owned copy') : `${l.edition} edition, ${isNew ? 'new' : 'pre-owned'}`}
          {l.shipping == null ? ', excl. shipping' : ''}
        </p>
      </div>
      <span className={`arrow-box mt-5 flex size-10 items-center justify-center self-end ${isNew ? 'bg-black' : 'bg-blue'}`}>
        <Arrow />
      </span>
      <span className="sr-only"> — opens {storeName} in a new tab</span>
    </a>
  );
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 border border-black">
      {options.map(([v, text]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-9 px-3.5 text-sm ${value === v ? 'bg-black text-white' : 'text-black hover:bg-grey-100'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Filters({ filters, setFilters, editions }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="-mx-5 mt-6 flex items-center gap-2 overflow-x-auto px-5 pb-1 no-scrollbar sm:mx-0 sm:px-0">
      <Segmented
        label="Condition"
        value={filters.condition}
        onChange={set('condition')}
        options={[['all', 'All'], ['new', 'New'], ['preowned', 'Pre-owned']]}
      />
      <label className="flex h-[38px] shrink-0 cursor-pointer items-center gap-2 border border-black px-3.5 text-sm">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => set('inStockOnly')(e.target.checked)}
          className="size-4 accent-blue"
        />
        In stock only
      </label>
      {editions.length > 1 && (
        <label className="flex h-[38px] shrink-0 items-center gap-1.5 border border-black pl-3.5 pr-1 text-sm">
          <span>Edition</span>
          <select value={filters.edition} onChange={(e) => set('edition')(e.target.value)} className="h-8 bg-grey-100 px-1.5">
            <option value="all">All</option>
            {editions.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

function EmptyState({ query, related, onSearch, failedCount, total }) {
  const allFailed = total > 0 && failedCount === total;
  return (
    <section className="mb-6">
      <h2 className="display text-[2rem] sm:text-[2.75rem]">
        {allFailed ? 'Couldn’t reach any store' : 'No store has this game for PS5 right now'}
      </h2>
      <p className="mt-3 max-w-[56ch] text-grey-600">
        {allFailed
          ? 'Check your connection and search again in a minute.'
          : failedCount > 0
            ? `${failedCount} of ${total} stores couldn’t be checked, so it may still be out there. Try again shortly, or check the spelling.`
            : 'Check the spelling, or search with fewer words — for example the game’s name without the edition.'}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {allFailed && <ArrowButton onClick={() => onSearch(query)}>Search again</ArrowButton>}
        {related.slice(0, 5).map((g) => (
          <ArrowButton key={g.key} tone="outline" size="sm" onClick={() => onSearch(g.title)}>{g.title}</ArrowButton>
        ))}
      </div>
    </section>
  );
}

// Heading: prefer a store title that contains what the user typed and keeps
// proper punctuation ("Marvel’s Spider-Man 2" over "Spiderman 2").
function pickTitle(listings, query = '') {
  const q = query.trim().toLowerCase();
  const score = (t) => (q && t.toLowerCase().includes(q) ? 4 : 0) + (/[’']/.test(t) ? 2 : 0) + (/[a-z]/.test(t) && /[A-Z]/.test(t) ? 1 : 0);
  const titles = [...new Set(listings.map((l) => l.displayTitle).filter(Boolean))];
  return titles.sort((a, b) => score(b) - score(a) || a.length - b.length)[0];
}

function Cover({ src, loading }) {
  const [ok, setOk] = useState(true);
  useEffect(() => setOk(true), [src]);
  const box = 'h-28 w-20 shrink-0 sm:h-36 sm:w-[6.5rem]';
  if (src && ok) return <img src={src} alt="" onError={() => setOk(false)} className={`${box} bg-surface object-cover`} />;
  return (
    <div className={`${box} flex items-end bg-surface p-2`} aria-hidden="true">
      <span className={`size-3 ${loading ? 'bg-grey-700' : 'bg-blue'}`} />
    </div>
  );
}
