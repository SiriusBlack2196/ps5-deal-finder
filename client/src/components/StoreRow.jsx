import { useState } from 'react';
import { inr, timeAgo, STORE_STYLE } from '../lib/format.js';
import { ArrowButton, Chip, Marker } from './ui.jsx';

export function StoreBadge({ id, name, dark = false }) {
  const s = STORE_STYLE[id] || { mono: name?.slice(0, 2) || '?' };
  const [imgOk, setImgOk] = useState(Boolean(s.domain));
  return (
    <span className={`relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden ${dark ? 'bg-surface-2 text-white' : 'bg-black text-white'}`} aria-hidden="true">
      <span className="meta">{s.mono}</span>
      {imgOk && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=64`}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          onLoad={(e) => { if (e.currentTarget.naturalWidth <= 16) setImgOk(false); }}
          className="absolute inset-0 m-auto size-6 bg-white"
        />
      )}
    </span>
  );
}

export function ListingRow({ l, storeName, highlight }) {
  const shippingText = l.shipping == null ? 'Shipping not listed' : l.shipping === 0 ? 'Free shipping' : `+ ${inr(l.shipping)} shipping`;
  return (
    <li className={`relative py-5 ${l.inStock ? '' : 'text-grey-600'}`}>
      {highlight && (
        <p className={`meta mb-3 flex items-center gap-2 ${highlight === 'new' ? 'text-blue' : 'text-[#C7431A]'}`}>
          <Marker tone={highlight === 'new' ? 'blue' : 'orange'} />
          {highlight === 'new' ? 'Best deal' : 'Best pre-owned'}
        </p>
      )}
      <div className="flex items-start gap-3.5">
        <StoreBadge id={l.store} name={storeName} />
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 [grid-template-areas:'info_price'_'meta_meta'_'cta_cta'] sm:[grid-template-areas:'info_price'_'meta_cta'] lg:grid-cols-[minmax(0,1fr)_11rem_9rem_auto] lg:items-center lg:gap-x-8 lg:[grid-template-areas:'info_meta_price_cta']">
          <div className="min-w-0 [grid-area:info]">
            <p className="text-[1.05rem] leading-tight text-black">{storeName}</p>
            <p className="mt-1 line-clamp-2 text-sm text-grey-600">{l.title}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {l.condition === 'preowned' ? <Chip tone="used">Pre-owned</Chip> : <Chip>New</Chip>}
              {l.edition !== 'Standard' && <Chip>{l.edition} edition</Chip>}
              {l.platform === 'ps4-ps5-upgrade' && <Chip tone="info">PS4 disc, free PS5 upgrade</Chip>}
              {!l.inStock && <Chip tone="warn">Out of stock</Chip>}
            </div>
          </div>
          <p className="meta text-grey-600 [grid-area:meta] sm:self-end lg:self-center">
            {inr(l.price)} item price<br />
            {shippingText}<br />
            Checked {timeAgo(l.fetchedAt)}
          </p>
          <p className="price text-right text-[1.75rem] leading-none text-black [grid-area:price] sm:text-[2rem]">{inr(l.effectivePrice)}</p>
          <div className="[grid-area:cta] sm:justify-self-end">
            <ArrowButton
              as="a"
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="sm"
              tone={highlight ? 'blue' : 'outline'}
              className="w-full justify-between sm:w-auto"
            >
              Go to store<span className="sr-only"> (opens {storeName} in a new tab)</span>
            </ArrowButton>
          </div>
        </div>
      </div>
      <div className="dots-x absolute inset-x-0 bottom-0" />
    </li>
  );
}

export function SkeletonRow({ storeId, storeName }) {
  return (
    <li className="relative py-5" aria-label={`Checking ${storeName}`}>
      <div className="flex items-start gap-3.5">
        <StoreBadge id={storeId} name={storeName} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[1.05rem] leading-tight text-black">{storeName}</p>
              <p className="meta mt-1.5 text-grey-500">Checking prices…</p>
            </div>
            <span className="skeleton h-7 w-24" />
          </div>
          <span className="skeleton mt-4 block h-6 w-32" />
        </div>
      </div>
      <div className="dots-x absolute inset-x-0 bottom-0" />
    </li>
  );
}

export function StoreNotice({ storeId, storeName, kind, detail, count, onShowAll }) {
  return (
    <li className="relative flex items-center gap-3.5 py-4 text-sm">
      <StoreBadge id={storeId} name={storeName} />
      <p className="flex-1 text-grey-600">
        {kind === 'error' && <><span className="text-black">Couldn't fetch from {storeName}.</span> {detail}.</>}
        {kind === 'missing' && <><span className="text-black">{storeName}</span> doesn't have this game for PS5.</>}
        {kind === 'hidden' && <>{count} {count === 1 ? 'listing' : 'listings'} at <span className="text-black">{storeName}</span> hidden by your filters.</>}
      </p>
      {kind === 'hidden' && onShowAll && (
        <button onClick={onShowAll} className="meta h-8 shrink-0 border border-black px-3 text-black hover:bg-black hover:text-white">Show</button>
      )}
      <div className="dots-x absolute inset-x-0 bottom-0" />
    </li>
  );
}
