// Home: horizontally scrolling cards of the biggest discounts off store MRP.
import { useEffect, useRef, useState } from 'react';
import { getDeals, getStores } from '../lib/api.js';
import { Thumb } from '../lib/thumbs.jsx';
import { inr } from '../lib/format.js';
import { StoreBadge } from './StoreRow.jsx';

function Arrow({ dir, onClick, disabled }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      aria-label={dir === 'left' ? 'Scroll deals left' : 'Scroll deals right'}
      className="flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_0_0_1px_var(--color-line)] transition-colors duration-200 hover:bg-blue hover:text-white disabled:pointer-events-none disabled:opacity-40"
    >
      <svg viewBox="0 0 16 16" className={`size-4 ${dir === 'left' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
    </button>
  );
}

export default function BestDeals({ onSearch }) {
  const [deals, setDeals] = useState([]);
  const [names, setNames] = useState({});
  const [edge, setEdge] = useState({ start: true, end: false });
  const track = useRef(null);

  useEffect(() => {
    getDeals().then(setDeals).catch(() => {});
    getStores().then((s) => setNames(Object.fromEntries(s.map((x) => [x.id, x.name])))).catch(() => {});
  }, []);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(onScroll, [deals]);
  const page = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: 'smooth' });

  if (!deals.length) return null;
  return (
    <section aria-labelledby="deals-h" className="mx-auto max-w-6xl pb-6 sm:pb-10">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-8">
        <div>
          <h2 id="deals-h" className="display text-[2rem] sm:text-[2.6rem]">Best deals</h2>
          <p className="mt-1 text-muted">Biggest discounts off store MRP on new copies</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Arrow dir="left" onClick={() => page(-1)} disabled={edge.start} />
          <Arrow dir="right" onClick={() => page(1)} disabled={edge.end} />
        </div>
      </div>
      <ul
        ref={track} onScroll={onScroll}
        className="mt-5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-8 pt-1 [scrollbar-width:none] sm:scroll-px-8 sm:gap-4 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {deals.map((d) => (
          <li key={d.gameKey} className="w-[14.6rem] shrink-0 snap-start sm:w-[15.8rem]">
            <button
              type="button" onClick={() => onSearch(d.title)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-card bg-white text-left shadow-[0_0_0_1px_var(--color-line)] transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--color-line),0_14px_30px_-12px_rgb(0_0_0/0.35)]"
            >
              <span className="relative block">
                {/* Same box for every cover: 5:7 is the common PS5 case-art shape; anchored to the top so the PS5 banner always shows. */}
                <Thumb title={d.title} size="lg" className="block aspect-[5/7] w-full object-top" />
                <span className="absolute left-2.5 top-2.5 inline-flex h-7 items-center rounded-full bg-green px-2.5 text-sm font-bold text-white">
                  {d.discountPct}% off
                </span>
              </span>
              <span className="flex flex-1 flex-col p-3.5 sm:p-4">
                <span className="line-clamp-2 min-h-[2.6em] font-semibold leading-snug group-hover:text-blue">{d.title}</span>
                <span className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <s className="text-sm text-muted [font-variant-numeric:tabular-nums]"><span className="sr-only">MRP </span>{inr(d.mrp)}</s>
                  <span className="price text-[1.35rem] leading-none text-green"><span className="sr-only">now </span>{inr(d.price)}</span>
                </span>
                <span className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <StoreBadge id={d.store} name={names[d.store]} size="sm" />
                  <span className="truncate">at {names[d.store] || d.store}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
