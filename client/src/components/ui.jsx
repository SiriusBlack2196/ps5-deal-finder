// Shared pieces in the playstation.com idiom: pill buttons, pill tags, small dots.

import { inr } from '../lib/format.js';

/**
 * Store's MRP struck through, then the current price beside it, and the discount in green.
 * `deal` colours the current price green (best-deal rows and cards).
 */
export function Price({ price, mrp, discountPct, deal = false, size = 'md', align = 'start' }) {
  const big = { md: 'text-[1.6rem] sm:text-[1.85rem]', lg: 'text-[2rem] sm:text-[2.75rem]' }[size];
  const small = { md: 'text-[0.95rem]', lg: 'text-base sm:text-lg' }[size];
  return (
    <span className={`flex flex-col ${align === 'end' ? 'items-end text-right' : 'items-start'}`}>
      <span className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${align === 'end' ? 'justify-end' : ''}`}>
        {mrp && (
          <s className={`text-muted ${small} [font-variant-numeric:tabular-nums]`}>
            <span className="sr-only">MRP </span>{inr(mrp)}
          </s>
        )}
        <span className={`price leading-none ${big} ${deal ? 'text-green' : ''}`}><span className="sr-only">{mrp ? 'now ' : ''}</span>{inr(price)}</span>
      </span>
      {mrp && discountPct > 0 && <span className="mt-1 text-sm font-bold text-green">{discountPct}% off MRP</span>}
    </span>
  );
}

/** Pill button. tone: primary (blue) | secondary (blue ring) | light (white, for dark bands) */
export function Button({ as: Tag = 'button', children, tone = 'primary', size = 'md', className = '', ...props }) {
  const sizes = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-6 text-[0.95rem]', lg: 'h-12 px-7 text-base' };
  const tones = {
    primary: 'bg-blue text-white hover:bg-blue-hover active:bg-blue-press',
    secondary: 'bg-white text-blue shadow-[inset_0_0_0_2px_var(--color-blue)] hover:bg-blue hover:text-white',
    light: 'bg-white text-ink hover:bg-ground',
  };
  return (
    <Tag className={`btn-label inline-flex shrink-0 items-center justify-center gap-2 rounded-full transition-colors duration-200 ${sizes[size]} ${tones[tone]} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function Dot({ tone = 'blue', className = '' }) {
  const bg = { blue: 'bg-blue', yellow: 'bg-yellow', light: 'bg-blue-light', grey: 'bg-line' }[tone];
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${bg} ${className}`} />;
}

export function Chip({ children, tone = 'plain' }) {
  const tones = {
    plain: 'bg-chip text-ink-2',
    used: 'bg-yellow text-ink',
    info: 'bg-[#E3F1FC] text-[#00559A]',
    warn: 'bg-[#FBE8EC] text-red',
  };
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Simple wordmark: a blue rounded square with a rupee sign (deliberately not Sony's logo). */
export function Wordmark({ onDark = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-box bg-blue text-[1rem] font-bold text-white">₹</span>
      <span className={`text-[1.05rem] font-semibold ${onDark ? 'text-white' : 'text-ink'}`}>PS5 Deal Finder</span>
    </span>
  );
}
