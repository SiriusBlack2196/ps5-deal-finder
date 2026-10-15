import { STORE_STYLE } from '../lib/format.js';
import { Badge, Button, Price } from './ui.jsx';

export function StoreBadge({ id, name, size = 'md' }) {
  const s = STORE_STYLE[id] || { mono: name?.slice(0, 2) || '?' };
  const box = size === 'sm' ? 'size-5 rounded-[3px]' : 'size-9 rounded-[4px]';
  if (s.logo) {
    return (
      <span aria-hidden="true" style={{ background: s.tile }} className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${box}`}>
        <img src={s.logo} alt="" className={size === 'sm' ? 'size-4' : 'size-7'} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" style={{ background: s.bg, color: s.fg }} className={`inline-flex shrink-0 items-center justify-center font-bold ${box} ${size === 'sm' ? 'text-[0.5rem]' : 'text-[0.7rem]'}`}>
      {s.mono}
    </span>
  );
}

/** One listing as a row of the price table. */
export function ListingRow({ l, storeName, highlight }) {
  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-6 sm:px-5 ${l.inStock ? '' : 'opacity-60'}`}>
      <span className="row-span-2 pt-0.5 sm:row-span-1 sm:pt-0"><StoreBadge id={l.store} name={storeName} /></span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[1rem] font-semibold leading-tight text-paper">{storeName}</span>
          {highlight && <Badge tone={highlight === 'new' ? 'new' : 'used'}>{highlight === 'new' ? 'Best deal (new)' : 'Best pre-owned'}</Badge>}
        </p>
        <p className="mt-1 line-clamp-1 text-[0.85rem] text-dim" title={l.title}>{l.title}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{l.condition === 'preowned' ? 'Pre-owned' : 'New'}</Badge>
          {l.edition !== 'Standard' && <Badge>{l.edition} edition</Badge>}
          {l.platform === 'ps4-ps5-upgrade' && <Badge tone="info">PS4 disc, free PS5 upgrade</Badge>}
          {l.preorder && <Badge tone="info">Pre-order</Badge>}
          {l.storeOnly && l.inStock && <Badge tone="info">Buy in store</Badge>}
          {l.shipping === 0 && <Badge tone="info">Free delivery</Badge>}
          {!l.inStock && <Badge tone="warn">Out of stock</Badge>}
        </div>
      </div>
      {/* Phones: price and action share a line under the details. */}
      <div className="col-start-2 mt-3 flex items-end justify-between gap-3 sm:col-start-auto sm:mt-0 sm:contents">
        <span className="sm:justify-self-end"><Price price={l.effectivePrice} mrp={l.mrp} discountPct={l.discountPct} align="end" /></span>
        <Button as="a" href={l.url} target="_blank" rel="noopener noreferrer nofollow" tone="quiet" size="md" className="sm:justify-self-end">
          View deal<span className="sr-only"> at {storeName} (opens in a new tab)</span>
        </Button>
      </div>
    </li>
  );
}

export function SkeletonRow({ storeId, storeName }) {
  return (
    <li className="flex items-center gap-3.5 px-4 py-4 sm:px-5" aria-label={`Checking ${storeName}`}>
      <StoreBadge id={storeId} name={storeName} />
      <div className="flex-1">
        <p className="text-[1rem] font-semibold leading-tight text-paper">{storeName}</p>
        <p className="mt-1 text-[0.85rem] text-dim">Checking prices</p>
      </div>
      <span className="skeleton h-7 w-24 rounded-[3px]" />
    </li>
  );
}

/** Stores with nothing to show, as quiet lines under the table. */
export function StoreNotice({ storeId, storeName, kind, detail, count, onShowAll }) {
  return (
    <li className="flex items-center gap-3 py-2.5 text-[0.88rem]">
      <StoreBadge id={storeId} name={storeName} size="sm" />
      <p className="flex-1 text-dim">
        {kind === 'error' && <><span className="text-paper">{storeName}</span> couldn't be checked. {detail}.</>}
        {kind === 'missing' && <><span className="text-paper">{storeName}</span> doesn't stock this game for PS5.</>}
        {kind === 'hidden' && <><span className="text-paper">{storeName}</span> has {count} more {count === 1 ? 'listing' : 'listings'} hidden by your filters.</>}
      </p>
      {kind === 'hidden' && onShowAll && <Button size="sm" tone="ghost" onClick={onShowAll} className="underline decoration-dim underline-offset-4">Show</Button>}
    </li>
  );
}
