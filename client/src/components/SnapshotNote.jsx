const fmt = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(iso)) + ' IST';
  } catch { return iso; }
};

/** Tells viewers these are saved prices, not a live lookup. */
export default function SnapshotNote({ info, className = '', compact = false }) {
  return (
    <p className={`meta flex items-start gap-2 text-grey-400 ${className}`}>
      <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 bg-orange" />
      <span>
        Prices saved on {fmt(info.fetchedAt)}, not live.
        {!compact && ' Search covers every PS5 game listed at Console Garage and E2Z.'}
      </span>
    </p>
  );
}
