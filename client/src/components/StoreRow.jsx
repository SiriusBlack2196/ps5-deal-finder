import { STORE_STYLE } from '../lib/format.js';
import { Button, Chip, Price } from './ui.jsx';

export function StoreBadge({ id, name, size = 'md' }) {
  const s = STORE_STYLE[id] || { mono: name?.slice(0, 2) || '?' };
  const box = size === 'sm' ? 'size-6 rounded-full' : 'size-11 rounded-box';
  if (s.logo) {
    return (
      <span aria-hidden="true" style={{ background: s.tile }} className={`inline-flex shrink-0 items-center justify-center overflow-hidden shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ${box}`}>
        <img src={s.logo} alt="" className={size === 'sm' ? 'size-5' : 'size-9'} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" style={{ background: s.bg, color: s.fg }} className={`inline-flex shrink-0 items-center justify-center font-bold tracking-wide ${box} ${size === 'sm' ? 'text-[0.55rem]' : 'text-[0.8rem]'}`}>
      {s.mono}
    </span>
  );
}

export function ListingRow({ l, storeName, highlight }) {
  // Same hairline for every row; the green badge and price mark the best deals (a coloured outline read as 'selected').
  const ring = 'shadow-[0_0_0_1px_var(--color-line)]';
  return (
    <li className={`rounded-card bg-white p-4 sm:p-5 ${ring} ${l.inStock ? '' : 'opacity-75'}`}>
      {highlight && (
        <p className="mb-3">
          <span className="inline-flex h-6 items-center rounded-full bg-green px-2.5 text-xs font-bold text-white">
            {highlight === 'new' ? 'Best deal (new)' : 'Best pre-owned'}
          </span>
        </p>
      )}
      <div className="flex items-start gap-3.5">
        <StoreBadge id={l.store} name={storeName} />
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-3 [grid-template-areas:'info'_'price'_'cta'] sm:grid-cols-[minmax(0,1fr)_auto] sm:[grid-template-areas:'info_price'_'info_cta'] lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-8 lg:[grid-template-areas:'info_price_cta']">
          <div className="min-w-0 [grid-area:info]">
            <p className="text-[1.05rem] font-semibold leading-tight">{storeName}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{l.title}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {l.condition === 'preowned' ? <Chip>Pre-owned</Chip> : <Chip>New</Chip>}
              {l.edition !== 'Standard' && <Chip>{l.edition} edition</Chip>}
              {l.platform === 'ps4-ps5-upgrade' && <Chip tone="info">PS4 disc, free PS5 upgrade</Chip>}
              {l.preorder && <Chip tone="info">Pre-order</Chip>}
              {!l.inStock && <Chip tone="warn">Out of stock</Chip>}
            </div>
          </div>
          <div className="[grid-area:price] sm:justify-self-end">
            <span className="sm:hidden"><Price price={l.effectivePrice} mrp={l.mrp} discountPct={l.discountPct} deal={!!highlight} /></span>
            <span className="hidden sm:block"><Price price={l.effectivePrice} mrp={l.mrp} discountPct={l.discountPct} deal={!!highlight} align="end" /></span>
          </div>
          <div className="[grid-area:cta] sm:justify-self-end">
            <Button
              as="a"
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="md"
              tone="primary"
              className="w-full sm:w-auto"
            >
              View deal<span className="sr-only"> at {storeName} (opens in a new tab)</span>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function SkeletonRow({ storeId, storeName }) {
  return (
    <li className="rounded-card bg-white p-4 shadow-[0_0_0_1px_var(--color-line)] sm:p-5" aria-label={`Checking ${storeName}`}>
      <div className="flex items-start gap-3.5">
        <StoreBadge id={storeId} name={storeName} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[1.05rem] font-semibold leading-tight">{storeName}</p>
              <p className="mt-1 text-sm text-muted">Checking prices…</p>
            </div>
            <span className="skeleton h-7 w-24 rounded-box" />
          </div>
          <span className="skeleton mt-4 block h-6 w-32 rounded-full" />
        </div>
      </div>
    </li>
  );
}

export function StoreNotice({ storeId, storeName, kind, detail, count, onShowAll }) {
  return (
    <li className="flex items-center gap-3.5 rounded-card border border-dashed border-line bg-white/60 px-4 py-3.5 text-sm sm:px-5">
      <StoreBadge id={storeId} name={storeName} />
      <p className="flex-1 text-muted">
        {kind === 'error' && <><span className="font-semibold text-ink">Couldn't fetch from {storeName}.</span> {detail}.</>}
        {kind === 'missing' && <><span className="font-semibold text-ink">{storeName}</span> doesn't have this game for PS5.</>}
        {kind === 'hidden' && <>{count} {count === 1 ? 'listing' : 'listings'} at <span className="font-semibold text-ink">{storeName}</span> hidden by your filters.</>}
      </p>
      {kind === 'hidden' && onShowAll && (
        <Button size="sm" tone="secondary" onClick={onShowAll}>Show</Button>
      )}
    </li>
  );
}
