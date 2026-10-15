// Shared pieces for the collector's-shelf look: rectangular controls, paper-on-wall contrast,
// tabular prices. `onPaper` variants are for things printed on a price tag.

import { inr } from '../lib/format.js';

/**
 * Current price, the store's MRP struck through beside it, and the discount in green.
 * `mrpAfter` puts the MRP to the right of the price (headline deal panels).
 */
export function Price({ price, mrp, discountPct, size = 'md', align = 'start', mrpAfter = false, onPaper = false }) {
  const big = { sm: 'text-[1.15rem]', md: 'text-[1.5rem] sm:text-[1.65rem]', lg: 'text-[2.25rem] sm:text-[2.75rem]' }[size];
  const small = { sm: 'text-[0.8rem]', md: 'text-[0.9rem]', lg: 'text-base sm:text-lg' }[size];
  const strike = onPaper ? 'text-ink-2' : 'text-dim';
  const mrpEl = (
    <s className={`${strike} ${small} [font-variant-numeric:tabular-nums] decoration-1`}>
      <span className="sr-only">MRP </span>{inr(mrp)}
    </s>
  );
  return (
    <span className={`flex flex-col ${align === 'end' ? 'items-end text-right' : 'items-start'}`}>
      <span className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${align === 'end' ? 'justify-end' : ''}`}>
        {mrp && !mrpAfter && mrpEl}
        <span className={`price leading-none ${onPaper ? 'text-ink' : 'text-paper'} ${big}`}><span className="sr-only">{mrp ? 'now ' : ''}</span>{inr(price)}</span>
        {mrp && mrpAfter && mrpEl}
      </span>
      {mrp && discountPct > 0 && (
        <span className={`mt-1.5 text-[0.82rem] font-semibold ${onPaper ? 'text-save-ink' : 'text-save'}`}>{discountPct}% off MRP</span>
      )}
    </span>
  );
}

/** tone: primary (paper on the wall) | quiet (outlined) | ghost (text only) */
export function Button({ as: Tag = 'button', children, tone = 'primary', size = 'md', className = '', ...props }) {
  const sizes = { sm: 'h-8 px-3 text-[0.85rem]', md: 'h-10 px-4 text-[0.92rem]', lg: 'h-12 px-6 text-base' };
  const tones = {
    primary: 'bg-paper text-ink hover:bg-white',
    quiet: 'text-paper shadow-[inset_0_0_0_1px_var(--color-edge-hi)] hover:bg-paper hover:text-ink hover:shadow-none',
    ghost: 'text-paper hover:bg-wall-3',
  };
  return (
    <Tag className={`btn-label inline-flex shrink-0 items-center justify-center gap-2 rounded-box transition-colors duration-150 ${sizes[size]} ${tones[tone]} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

/** Rectangular status badge: best deals (green / yellow), condition and notes (plain). */
export function Badge({ children, tone = 'plain' }) {
  const tones = {
    new: 'bg-save text-ink',
    used: 'bg-yellow text-ink',
    plain: 'text-paper-2 shadow-[inset_0_0_0_1px_var(--color-edge-hi)]',
    info: 'text-paper shadow-[inset_0_0_0_1px_var(--color-dim)]',
    warn: 'text-alert shadow-[inset_0_0_0_1px_rgb(240_138_138/0.5)]',
  };
  return <span className={`inline-flex h-[1.4rem] items-center rounded-[3px] px-1.5 text-[0.75rem] font-semibold leading-none ${tones[tone]}`}>{children}</span>;
}
export const Chip = Badge;

/** Logo mark: a magnifying glass with a rupee sign in the lens ("search for prices"). */
export function LogoMark({ className = 'size-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="13.5" cy="13.5" r="9.6" fill="none" stroke="var(--color-paper)" strokeWidth="2.6" />
      <path d="M21 21 L28.2 28.2" stroke="var(--color-paper)" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M9.6 8.9 H17.4 M9.6 11.9 H17.4 M11.2 8.9 Q15.9 8.9 15.9 11.9 Q15.9 14.9 10.6 14.9 L15.6 19.2" fill="none" stroke="var(--color-paper)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-paper">
      <LogoMark />
      <span className="spine text-[1.45rem] leading-none tracking-[0.005em]">Lowscore</span>
    </span>
  );
}

/** Five stars filled to `value` (0–5, halves allowed). */
export function Stars({ value, className = 'size-4' }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={`relative inline-block ${className}`}>
            <svg viewBox="0 0 20 20" className="absolute inset-0 size-full text-white/20" fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z" /></svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 20 20" className={`${className} text-yellow`} fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z" /></svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
