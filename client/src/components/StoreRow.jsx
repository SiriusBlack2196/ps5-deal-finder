import { useState } from 'react';
import { inr, timeAgo, STORE_STYLE } from '../lib/format.js';
import { Button, Chip } from './ui.jsx';
import { SNAPSHOT } from '../lib/api.js';

export function StoreBadge({ id, name }) {
  const s = STORE_STYLE[id] || { mono: name?.slice(0, 2) || '?' };
  const [imgOk, setImgOk] = useState(Boolean(s.domain) && !SNAPSHOT);
  return (
    <span className="relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-box bg-ink text-white" aria-hidden="true">
      <span className="text-[0.8rem] font-bold tracking-wide">{s.mono}</span>
      {imgOk && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=64`}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          onLoad={(e) => { if (e.currentTarget.naturalWidth <= 16) setImgOk(false); }}
          className="absolute inset-0 m-auto size-7 rounded-[6px] bg-white"
        />
      )}
    </span>
  );
}

export function ListingRow({ l, storeName, highlight }) {
  const shippingText = l.shipping == null ? 'Shipping not listed' : l.shipping === 0 ? 'Free shipping' : `+ ${inr(l.shipping)} shipping`;
  const ring = highlight ? 'shadow-[0_0_0_2px_var(--color-green)]' : 'shadow-[0_0_0_1px_var(--color-line)]';
  return (
    <li className={`rounded-card bg-white p-4 sm:p-5 ${ring} ${l.inStock ? '' : 'opacity-75'}`}>
      {highlight && (
        <p className="mb-3">
          <span className="inline-flex h-6 items-center rounded-full bg-green px-2.5 text-xs font-bold text-white">
            {highlight === 'new' ? 'Best deal' : 'Best pre-owned'}
          </span>
        </p>
      )}
      <div className="flex items-start gap-3.5">
        <StoreBadge id={l.store} name={storeName} />
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 [grid-template-areas:'info_price'_'meta_meta'_'cta_cta'] sm:[grid-template-areas:'info_price'_'meta_cta'] lg:grid-cols-[minmax(0,1fr)_11rem_8rem_auto] lg:items-center lg:gap-x-8 lg:[grid-template-areas:'info_meta_price_cta']">
          <div className="min-w-0 [grid-area:info]">
            <p className="text-[1.05rem] font-semibold leading-tight">{storeName}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{l.title}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {l.condition === 'preowned' ? <Chip tone="used">Pre-owned</Chip> : <Chip>New</Chip>}
              {l.edition !== 'Standard' && <Chip>{l.edition} edition</Chip>}
              {l.platform === 'ps4-ps5-upgrade' && <Chip tone="info">PS4 disc, free PS5 upgrade</Chip>}
              {l.preorder && <Chip tone="info">Pre-order</Chip>}
              {!l.inStock && <Chip tone="warn">Out of stock</Chip>}
            </div>
          </div>
          <p className="text-[0.8125rem] leading-snug text-muted [grid-area:meta] sm:self-end lg:self-center">
            {inr(l.price)} item price<br />
            {shippingText}<br />
            Checked {timeAgo(l.fetchedAt)}
          </p>
          <p className={`price text-right text-[1.6rem] leading-none [grid-area:price] sm:text-[1.85rem] ${highlight ? 'text-green' : ''}`}>{inr(l.effectivePrice)}</p>
          <div className="[grid-area:cta] sm:justify-self-end">
            <Button
              as="a"
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="md"
              tone={highlight ? 'primary' : 'secondary'}
              className="w-full sm:w-auto"
            >
              Go to store<span className="sr-only"> (opens {storeName} in a new tab)</span>
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
