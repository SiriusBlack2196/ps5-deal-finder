import { useMemo, useState, useEffect } from 'react';
import SearchBox from './SearchBox.jsx';
import { ListingRow, SkeletonRow, StoreNotice } from './StoreRow.jsx';
import { useSearch } from '../lib/api.js';
import { useThumb } from '../lib/thumbs.jsx';
import { pickGame, applyFilters, bestDeals, priceSpread, editionsIn } from '../lib/derive.js';
import { inr } from '../lib/format.js';
import { Button, Price, Wordmark } from './ui.jsx';

const DEFAULT_FILTERS = { condition: 'all', inStockOnly: true, edition: 'all' };

export default function Results({ query, onSearch, onHome }) {
  const { stores, byStore, finished, error } = useSearch(query);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
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
  const cachedThumb = useThumb(game.listings.length ? heroTitle : null, 'lg');
  const heroImage = (bestNew || bestUsed || game.listings[0])?.imageUrl || cachedThumb;
  const nothingAnywhere = finished && game.listings.length === 0;

  const doneCount = stores.length - pending.length;
  const pct = stores.length ? Math.round((doneCount / stores.length) * 100) : 0;

  return (
    <div className="min-h-dvh bg-ground">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 bg-white shadow-[0_1px_0_var(--color-line)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-8">
          <button onClick={onHome} aria-label="Back to home" className="shrink-0 rounded-box">
            <span className="hidden sm:inline"><Wordmark /></span>
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-box bg-blue font-bold text-white sm:hidden">₹</span>
          </button>
          <div className="min-w-0 flex-1 sm:max-w-xl"><SearchBox initial={query} onSearch={onSearch} size="sm" /></div>
        </div>
      </div>

      <section className="ps-band">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12">
          {error && <p role="alert" className="mb-6 rounded-card bg-white p-4 text-red">{error}</p>}

          <header className="flex items-end gap-5 sm:gap-7">
            <Cover src={heroImage} loading={!finished} />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="display text-[2.1rem] sm:text-[3.25rem]">{nothingAnywhere ? query : heroTitle}</h1>
              {game.fallbackTitle && <p className="mt-2 text-sm text-white/75">No exact match for “{query}”. Showing the closest game.</p>}
              <div className="mt-4 max-w-sm" aria-live="polite">
                <p className="text-sm text-white/80">
                  {finished
                    ? `${game.listings.length} ${game.listings.length === 1 ? 'listing' : 'listings'} from ${storesWithGame.size} of ${stores.length} stores`
                    : `Checking ${doneCount} of ${stores.length || '…'} stores`}
                </p>
                <div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            </div>
          </header>

          {(bestNew || bestUsed) && (
            <section aria-label="Best prices" className={`mt-8 grid gap-3 sm:gap-4 ${bestNew && bestUsed ? 'grid-cols-2' : 'grid-cols-1 sm:max-w-md'}`}>
              {bestNew && <DealCard kind="new" l={bestNew} storeName={storeName(bestNew.store)} />}
              {bestUsed && <DealCard kind="used" l={bestUsed} storeName={storeName(bestUsed.store)} />}
            </section>
          )}
          {finished && !bestNew && game.listings.length > 0 && (
            <p className="mt-8 rounded-card bg-white/10 p-4 text-sm text-white/85">
              No store has a new copy in stock right now.{bestUsed ? '' : ' Turn off “In stock only” to see out-of-stock listings.'}
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8">
          {nothingAnywhere && (
            <EmptyState query={query} related={game.related} onSearch={onSearch} failedCount={failed.length} total={stores.length} />
          )}

          {spread && spread.save > 0 && (
            <p className="text-lg">
              Save <span className="font-bold text-green">{inr(spread.save)}</span> vs the highest {spread.condition === 'preowned' ? 'pre-owned ' : ''}price
              <span className="text-muted"> across {spread.count} stores</span>
            </p>
          )}

          {game.listings.length > 0 && (
            <Filters filters={filters} setFilters={setFilters} editions={editions} />
          )}

          <ul className="mt-5 space-y-3" aria-busy={!finished}>
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
              <h2 className="text-lg font-semibold">Looking for a different game?</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {game.related.slice(0, 5).map((g) => (
                  <Button key={g.key} tone="secondary" size="sm" onClick={() => onSearch(g.title)}>{g.title}</Button>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function DealCard({ kind, l, storeName }) {
  const isNew = kind === 'new';
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="lift group flex flex-col rounded-card bg-white p-4 text-ink sm:p-6"
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex h-6 w-fit items-center rounded-full bg-green px-2.5 text-xs font-bold text-white">
          {isNew ? 'Best deal' : 'Best pre-owned'}
        </span>
      </span>
      <span className="mt-3"><Price price={l.effectivePrice} mrp={l.mrp} discountPct={l.discountPct} deal size="lg" /></span>
      <span className="mt-2 text-[0.95rem] font-semibold leading-snug">{storeName}</span>
      <span className="text-sm text-muted">
        {l.edition === 'Standard' ? (isNew ? 'New copy' : 'Pre-owned copy') : `${l.edition} edition, ${isNew ? 'new' : 'pre-owned'}`}
        {l.shipping == null ? ', excl. shipping' : ''}
      </span>
      <span className={`btn-label mt-4 inline-flex h-10 items-center justify-center rounded-full text-sm sm:mt-5 sm:h-11 bg-blue text-white transition-colors duration-200 group-hover:bg-blue-hover`}>
        View deal
      </span>
      <span className="sr-only"> (opens {storeName} in a new tab)</span>
    </a>
  );
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-line)]">
      {options.map(([v, text]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-8 rounded-full px-4 text-sm font-semibold transition-colors ${value === v ? 'bg-ink text-white' : 'text-ink hover:bg-ground'}`}
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
    <div className="-mx-4 mt-5 flex items-center gap-2 overflow-x-auto px-4 py-1 no-scrollbar sm:mx-0 sm:px-0">
      <Segmented
        label="Condition"
        value={filters.condition}
        onChange={set('condition')}
        options={[['all', 'All'], ['new', 'New'], ['preowned', 'Pre-owned']]}
      />
      <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow-[inset_0_0_0_1px_var(--color-line)]">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => set('inStockOnly')(e.target.checked)}
          className="size-4 accent-blue"
        />
        In stock only
      </label>
      {editions.length > 1 && (
        <label className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white pl-4 pr-1.5 text-sm font-semibold shadow-[inset_0_0_0_1px_var(--color-line)]">
          <span>Edition</span>
          <select value={filters.edition} onChange={(e) => set('edition')(e.target.value)} className="h-7 rounded-full bg-chip px-2 font-normal">
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
    <section className="mb-6 rounded-card bg-white p-6 shadow-[0_0_0_1px_var(--color-line)] sm:p-8">
      <h2 className="display text-[1.75rem] sm:text-[2.25rem]">
        {allFailed ? 'Couldn’t reach any store' : 'No store has this game for PS5 right now'}
      </h2>
      <p className="mt-3 max-w-[56ch] text-muted">
        {allFailed
          ? 'Check your connection and search again in a minute.'
          : failedCount > 0
            ? `${failedCount} of ${total} stores couldn’t be checked, so it may still be out there. Try again shortly, or check the spelling.`
            : 'Check the spelling, or search with fewer words — for example the game’s name without the edition.'}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {allFailed && <Button onClick={() => onSearch(query)}>Search again</Button>}
        {related.slice(0, 5).map((g) => (
          <Button key={g.key} tone="secondary" size="sm" onClick={() => onSearch(g.title)}>{g.title}</Button>
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
  const box = 'aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-card sm:w-36';
  if (src && ok) return <img src={src} alt="" onError={() => setOk(false)} className={`${box} bg-white/10 object-cover shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)]`} />;
  return <div className={`${box} ${loading ? 'animate-pulse' : ''} bg-white/10`} aria-hidden="true" />;
}
