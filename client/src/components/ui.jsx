// Small shared pieces in the sui.io idiom: square geometry, blue arrow blocks,
// 12px marker squares, mono chips.

export function Arrow({ className = 'size-4' }) {
  // Two arrows: the first slides in from the left as the second slides out (see .arrow-box).
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" />
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}

/** Text block + square blue arrow block, joined. */
export function ArrowButton({ as: Tag = 'button', children, tone = 'blue', size = 'md', className = '', ...props }) {
  const h = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-10' : 'h-12';
  const w = size === 'lg' ? 'w-14' : size === 'sm' ? 'w-10' : 'w-12';
  const text = {
    blue: 'bg-blue text-white',
    white: 'bg-white text-black',
    dark: 'bg-surface-2 text-white',
    outline: 'bg-transparent text-black border border-black border-r-0',
  }[tone];
  return (
    <Tag className={`group inline-flex shrink-0 items-stretch ${h} ${className}`} {...props}>
      {children && <span className={`flex flex-1 items-center px-4 text-[0.95rem] ${text}`}>{children}</span>}
      <span className={`arrow-box flex ${w} items-center justify-center bg-blue text-white ${tone === 'blue' && children ? 'border-l border-black/15' : ''}`}>
        <Arrow />
      </span>
    </Tag>
  );
}

export function Marker({ tone = 'blue', className = '' }) {
  const bg = { blue: 'bg-blue', orange: 'bg-orange', grey: 'bg-grey-400', dark: 'bg-surface-2' }[tone];
  return <span aria-hidden="true" className={`inline-block size-3 shrink-0 ${bg} ${className}`} />;
}

export function Chip({ children, tone = 'plain' }) {
  const tones = {
    plain: 'border-grey-300 text-grey-700',
    used: 'border-orange text-[#C7431A]',
    info: 'border-blue text-[#1F6FCC]',
    warn: 'border-alert text-alert',
  };
  return <span className={`meta inline-flex h-6 items-center border px-2 ${tones[tone]}`}>{children}</span>;
}
