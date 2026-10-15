// A shelf of game cases with paper price tags hanging from the edge.
// Desktop: rows of `perRow` on a fixed grid, each row its own shelf. Below lg: one row that
// scrolls sideways inside itself (the page never scrolls sideways).
// Every item draws its own stretch of shelf edge with no gaps, so the edge reads as one board.

import { Thumb } from '../lib/thumbs.jsx';

export function Shelf({ items, perRow = 6, label, renderTag, onPick, loading = false }) {
  const rows = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));

  if (loading) {
    return (
      <ul aria-label={label} aria-busy="true" className="flex overflow-hidden lg:grid lg:grid-cols-6">
        {Array.from({ length: perRow }, (_, i) => (
          <li key={i} className="w-[9.5rem] shrink-0 px-2 sm:w-[10.5rem] lg:w-auto lg:px-3">
            <span className="skeleton block aspect-[3/4] rounded-[3px]" />
            <span className="shelf-edge -mx-2 block lg:-mx-3" />
            <span className="mx-1 mt-0 block h-[4.6rem] rounded-b-[2px] bg-wall-2" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      {/* Phones and tablets: a single scrolling shelf. */}
      <ul aria-label={label} className="no-scrollbar -mx-4 flex snap-x snap-proximity overflow-x-auto px-4 pb-4 pt-2 sm:-mx-8 sm:px-8 lg:hidden">
        {items.map((it) => <Item key={it.key} it={it} renderTag={renderTag} onPick={onPick} className="w-[9.5rem] shrink-0 snap-start px-2 sm:w-[10.5rem]" edge="-mx-2" />)}
      </ul>
      {/* Desktop: fixed rows, one shelf each. */}
      <div className="hidden space-y-10 lg:block">
        {rows.map((row, r) => (
          <ul key={r} aria-label={rows.length > 1 ? `${label}, shelf ${r + 1}` : label} className="grid grid-cols-6 pt-2">
            {row.map((it) => <Item key={it.key} it={it} renderTag={renderTag} onPick={onPick} className="px-3" edge="-mx-3" />)}
            {/* Fill a short row with bare shelf so the board still runs the full width. */}
            {Array.from({ length: perRow - row.length }, (_, i) => (
              <li key={`gap-${i}`} aria-hidden="true" className="flex flex-col px-3">
                <span className="block aspect-[3/4] w-full" />
                <span className="shelf-edge -mx-3 block" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </>
  );
}

function Item({ it, renderTag, onPick, className, edge }) {
  return (
    <li className={`relative flex ${className}`}>
      <button type="button" onClick={() => onPick(it)} className="pull group flex w-full flex-col text-left focus-visible:outline-offset-4">
        <span className="shelf-light flex aspect-[3/4] w-full items-end">
          <Thumb title={it.title} size="lg" fallback="dark" className="case block aspect-[3/4] w-full bg-wall-2 object-cover" />
        </span>
        <span aria-hidden="true" className={`shelf-edge block ${edge}`} />
        <span className="tag mx-1 block flex-1 px-2.5 pb-2.5 pt-2">{renderTag(it)}</span>
      </button>
    </li>
  );
}

/** Title as printed on a tag: two lines at most. */
export function TagTitle({ children }) {
  return <span className="line-clamp-2 text-[0.8rem] font-semibold leading-[1.25] text-ink">{children}</span>;
}
