// Shared pieces in the playstation.com idiom: pill buttons, pill tags, small dots.

import { inr } from '../lib/format.js';

/**
 * Store's MRP struck through, then the current price beside it, and the discount in green.
 * Prices are always ink (black); only the discount line is green.
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
        <span className={`price leading-none text-ink ${big}`}><span className="sr-only">{mrp ? 'now ' : ''}</span>{inr(price)}</span>
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

/** Logo mark: a magnifying glass with a rupee sign in the lens ("search for prices"). */
export function LogoMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="13.5" cy="13.5" r="9.6" fill="#fff" stroke="var(--color-blue)" strokeWidth="3.2" />
      <path d="M21 21 L28.2 28.2" stroke="var(--color-blue)" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M9.6 8.9 H17.4 M9.6 11.9 H17.4 M11.2 8.9 Q15.9 8.9 15.9 11.9 Q15.9 14.9 10.6 14.9 L15.6 19.2" fill="none" stroke="#14213D" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ onDark = false }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={`text-[1.15rem] font-bold tracking-[-0.01em] ${onDark ? 'text-white' : 'text-ink'}`}>Lowscore</span>
    </span>
  );
}

/** Five stars filled to `value` (0–5, halves allowed). */
export function Stars({ value, className = 'size-5' }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={`relative inline-block ${className}`}>
            <svg viewBox="0 0 20 20" className="absolute inset-0 size-full text-white/25" fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z" /></svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 20 20" className={`${className} text-yellow`} fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z" /></svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
