import { useMemo, useState, useEffect } from 'react';
import SearchBox from './SearchBox.jsx';
import { ListingRow, SkeletonRow, StoreNotice } from './StoreRow.jsx';
import { useSearch } from '../lib/api.js';
import { useThumb } from '../lib/thumbs.jsx';
import { pickGame, applyFilters, bestDeals, priceSpread, editionsIn } from '../lib/derive.js';
import { inr } from '../lib/format.js';
import { Badge, Button, LogoMark, Price, Stars, Wordmark } from './ui.jsx';
import { getRating } from '../lib/ratings.js';
import { useHero } from '../lib/heroes.js';

const DEFAULT_FILTERS = { condition: 'all', inStockOnly: true, edition: 'all' };

export default function Results({ query, onSearch, onHome, onBack = onHome }) {
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
  const heroBg = useHero(game.listings.length ? heroTitle : null);
  const nothingAnywhere = finished && game.listings.length === 0;

  const doneCount = stores.length - pending.length;
  const pct = stores.length ? Math.round((doneCount / stores.length) * 100) : 0;

  const counted = visible.length;

  return (
    <div className="min-h-dvh">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-edge bg-wall/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[75rem] items-center gap-3 px-4 sm:gap-5 sm:px-8">
          <button
            type="button" onClick={onBack} aria-label="Back"
            className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-box text-paper transition-colors hover:bg-wall-3"
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5" /></svg>
          </button>
          <button onClick={onHome} aria-label="Lowscore home" className="shrink-0">
            <span className="hidden sm:inline"><Wordmark /></span>
            <span className="sm:hidden"><LogoMark /></span>
          </button>
          <div className="min-w-0 flex-1 sm:ml-4 sm:max-w-xl"><SearchBox initial={query} onSearch={onSearch} size="sm" /></div>
        </div>
      </div>

      <section className="relative isolate overflow-hidden">
        {heroBg && (
          <div aria-hidden="true" className="hero-art absolute inset-0 -z-10">
            <img src={heroBg} alt="" className="size-full object-cover object-[center_30%]" />
          </div>
        )}
        <div className="mx-auto max-w-[75rem] px-4 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-16">
          {error && <p role="alert" className="mb-6 rounded-box p-4 text-alert shadow-[inset_0_0_0_1px_var(--color-alert)]">{error}</p>}

          <header className="flex items-end gap-5 sm:gap-9">
            <Cover src={heroImage} loading={!finished} />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="spine text-[2.3rem] text-paper sm:text-[4rem]">{nothingAnywhere ? query : heroTitle}</h1>
              {game.fallbackTitle && <p className="mt-2 text-[0.9rem] text-paper-2">No exact match for “{query}”. Showing the closest game.</p>}
              {finished ? (
                <CriticRating title={nothingAnywhere ? null : heroTitle} />
              ) : (
                <div className="mt-5 max-w-xs" aria-live="polite">
                  <p className="text-[0.85rem] text-paper-2">{`Checking ${doneCount} of ${stores.length || '…'} stores`}</p>
                  <div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                </div>
              )}
            </div>
          </header>

          {(bestNew || bestUsed) && (
            <section aria-label="Best prices" className={`mt-10 grid gap-3 sm:gap-4 ${bestNew && bestUsed ? 'grid-cols-2' : 'grid-cols-1 sm:max-w-md'} lg:max-w-[52rem]`}>
              {bestNew && <DealCard kind="new" l={bestNew} storeName={storeName(bestNew.store)} />}
              {bestUsed && <DealCard kind="used" l={bestUsed} storeName={storeName(bestUsed.store)} />}
            </section>
          )}
          {finished && !bestNew && game.listings.length > 0 && (
            <p className="mt-8 max-w-[60ch] text-[0.92rem] text-paper-2">
              No store has a new copy in stock right now.{bestUsed ? '' : ' Turn off “In stock only” to see out-of-stock listings.'}
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[75rem] px-4 pb-20 sm:px-8">
          {nothingAnywhere && (
            <EmptyState query={query} related={game.related} onSearch={onSearch} failedCount={failed.length} total={stores.length} />
          )}

          {game.listings.length > 0 && (
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div>
                <h2 className="spine text-[1.6rem] text-paper sm:text-[1.9rem]">Every listing</h2>
                <p className="mt-1 text-[0.9rem] text-dim">
                  {counted} {counted === 1 ? 'listing' : 'listings'}, cheapest first
                  {spread && spread.save > 0 && <>. <span className="text-save">{inr(spread.save)}</span> between the cheapest and priciest {spread.condition === 'preowned' ? 'pre-owned' : 'new'} copy</>}
                </p>
              </div>
              <Filters filters={filters} setFilters={setFilters} editions={editions} />
            </div>
          )}

          {(visible.length > 0 || pending.length > 0) && (
            <ul className="mt-5 divide-y divide-edge overflow-hidden rounded-card bg-wall-2 shadow-[inset_0_0_0_1px_var(--color-edge)]" aria-busy={!finished}>
              {visible.map((l) => (
                <ListingRow
                  key={l.url}
                  l={l}
                  storeName={storeName(l.store)}
                  highlight={l === bestNew ? 'new' : l === bestUsed ? 'used' : null}
                />
              ))}
              {pending.map((s) => <SkeletonRow key={s.id} storeId={s.id} storeName={s.name} />)}
            </ul>
          )}

          {(hiddenByFilters.length > 0 || failed.length > 0 || (finished && !nothingAnywhere && missing.length > 0)) && (
            <ul className="mt-4 px-1">
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
          )}

          {!nothingAnywhere && finished && game.related.length > 0 && (
            <section className="mt-14">
              <h2 className="text-[1rem] font-semibold text-paper">Looking for a different game?</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {game.related.slice(0, 5).map((g) => (
                  <Button key={g.key} tone="quiet" size="sm" onClick={() => onSearch(g.title)}>{g.title}</Button>
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
  const note = l.storeOnly ? 'buy in a CeX store' : l.shipping === 0 ? 'free delivery' : l.shipping == null ? 'shipping extra' : null;
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex flex-col rounded-card bg-wall-2/85 p-3.5 shadow-[inset_0_0_0_1px_var(--color-edge-hi)] backdrop-blur-sm transition-colors hover:bg-wall-3/90 sm:p-6"
    >
      <span><Badge tone={isNew ? 'new' : 'used'}>{isNew ? 'Best deal (new)' : 'Best pre-owned'}</Badge></span>
      <span className="mt-3 sm:hidden"><Price price={l.effectivePrice} mrp={l.mrp} discountPct={l.discountPct} size="md" /></span>
      <span className="mt-4 hidden sm:block"><Price price={l.effectivePrice} mrp={l.mrp} discountPct={l.discountPct} size="lg" mrpAfter /></span>
      <span className="mt-3 text-[0.95rem] font-semibold leading-snug text-paper">{storeName}</span>
      <span className="flex-1 text-[0.8rem] leading-snug text-dim sm:text-[0.85rem]">
        {l.edition === 'Standard' ? (isNew ? 'New copy' : 'Pre-owned copy') : `${l.edition} edition, ${isNew ? 'new' : 'pre-owned'}`}
        {note ? `, ${note}` : ''}
      </span>
      <span className="btn-label mt-4 inline-flex h-10 items-center justify-center rounded-box bg-paper px-2 text-[0.88rem] text-ink transition-colors group-hover:bg-white sm:mt-5 sm:h-11 sm:text-[0.92rem]">
        View deal<span className="hidden sm:inline">&nbsp;at {storeName}</span>
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-box p-0.5 shadow-[inset_0_0_0_1px_var(--color-edge-hi)]">
      {options.map(([v, text]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-8 rounded-[4px] px-3 text-[0.85rem] font-semibold transition-colors ${value === v ? 'bg-paper text-ink' : 'text-paper-2 hover:text-paper'}`}
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
    <div className="-mx-4 flex max-w-[100vw] items-center gap-2 overflow-x-auto px-4 py-1 no-scrollbar sm:mx-0 sm:px-0">
      <Segmented
        label="Condition"
        value={filters.condition}
        onChange={set('condition')}
        options={[['all', 'All'], ['new', 'New'], ['preowned', 'Pre-owned']]}
      />
      <label className="flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-box px-3 text-[0.85rem] font-semibold text-paper shadow-[inset_0_0_0_1px_var(--color-edge-hi)]">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => set('inStockOnly')(e.target.checked)}
          className="size-4 shrink-0 cursor-pointer appearance-none rounded-[3px] bg-center bg-no-repeat shadow-[inset_0_0_0_1.5px_var(--color-dim)] transition-colors checked:bg-paper checked:shadow-none checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20d=%22M3.5%208.5l3%203%206-7%22%20fill=%22none%22%20stroke=%22%2315181D%22%20stroke-width=%222.2%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')]"
        />
        In stock only
      </label>
      {editions.length > 1 && (
        <label className="flex h-9 shrink-0 items-center gap-1.5 rounded-box pl-3 pr-1 text-[0.85rem] font-semibold text-paper shadow-[inset_0_0_0_1px_var(--color-edge-hi)]">
          <span>Edition</span>
          <select value={filters.edition} onChange={(e) => set('edition')(e.target.value)} className="h-7 rounded-[4px] bg-wall-3 px-2 font-normal text-paper">
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
    <section className="mb-6 max-w-[40rem] py-4">
      <h2 className="spine text-[1.9rem] text-paper sm:text-[2.4rem]">
        {allFailed ? 'Couldn’t reach any store' : 'No store has this game for PS5 right now'}
      </h2>
      <p className="mt-3 max-w-[56ch] text-dim">
        {allFailed
          ? 'Check your connection and search again in a minute.'
          : failedCount > 0
            ? `${failedCount} of ${total} stores couldn’t be checked, so it may still be out there. Try again shortly, or check the spelling.`
            : 'Check the spelling, or search with fewer words, for example the game’s name without the edition.'}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {allFailed && <Button onClick={() => onSearch(query)}>Search again</Button>}
        {related.slice(0, 5).map((g) => (
          <Button key={g.key} tone="quiet" size="sm" onClick={() => onSearch(g.title)}>{g.title}</Button>
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

function CriticRating({ title }) {
  const r = title ? getRating(title) : null;
  if (!r) return title ? <p className="mt-4 text-[0.85rem] text-paper-2">No critic score yet</p> : null;
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-paper" aria-label={`Rated ${r.stars} out of 5 by critics: Metascore ${r.score} from ${r.count} reviews`}>
      <Stars value={r.stars} />
      <span className="price text-[1.05rem] leading-none">{r.stars.toFixed(1)}</span>
      <span className="text-[0.85rem] text-paper-2">
        Metascore {r.score}{r.count ? ` from ${r.count} critics on ` : ' on '}
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline decoration-paper-2/50 underline-offset-[3px] hover:decoration-paper">Metacritic</a>
      </span>
    </p>
  );
}

function Cover({ src, loading }) {
  const [ok, setOk] = useState(true);
  useEffect(() => setOk(true), [src]);
  const box = 'case aspect-[3/4] w-[6.5rem] shrink-0 overflow-hidden sm:w-44';
  if (src && ok) return <img src={src} alt="" onError={() => setOk(false)} className={`${box} bg-wall-2 object-cover`} />;
  return <div className={`${box} ${loading ? 'skeleton' : ''} bg-wall-2`} aria-hidden="true" />;
}
