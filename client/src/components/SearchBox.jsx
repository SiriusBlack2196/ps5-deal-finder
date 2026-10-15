import { useEffect, useId, useRef, useState } from 'react';
import { suggest } from '../lib/api.js';
import { Thumb } from '../lib/thumbs.jsx';

export default function SearchBox({ initial = '', onSearch, size = 'lg', autoFocus = false }) {
  const [value, setValue] = useState(initial);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef(null);

  useEffect(() => setValue(initial), [initial]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setItems([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      suggest(q, ctrl.signal)
        .then((list) => { setItems(list); setActive(-1); })
        .catch(() => {});
    }, 140);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  const submit = (text) => {
    const q = (text ?? value).trim();
    if (q.length < 2) return;
    setValue(q);
    setOpen(false);
    inputRef.current?.blur();
    onSearch(q);
  };

  const onKeyDown = (e) => {
    if (!open || items.length === 0) { if (e.key === 'Enter') { e.preventDefault(); submit(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(active >= 0 ? items[active] : undefined); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const big = size === 'lg';
  const showList = open && items.length > 0;

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }} className="relative w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">Search for a PS5 game</label>
      <div className={`flex items-center rounded-box bg-wall-2 text-paper shadow-[inset_0_0_0_1px_var(--color-edge-hi)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_var(--color-paper)] ${big ? 'h-14 pl-4 pr-1.5 sm:h-[3.75rem]' : 'h-10 pl-3 pr-1'}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className={`${big ? 'size-5' : 'size-[1.1rem]'} shrink-0 text-dim`} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
        <input
          id={`${listId}-input`}
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Search a PS5 game"
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-dim focus-visible:outline-none ${big ? 'px-3 text-[1.05rem]' : 'px-2 text-[0.95rem]'}`}
        />
        <button
          type="submit"
          className={`btn-label shrink-0 rounded-[4px] bg-paper text-ink transition-colors hover:bg-white ${big ? 'h-11 px-5 text-[0.95rem] sm:h-12 sm:px-6' : 'h-8 px-3 text-[0.85rem]'}`}
        >
          Search
        </button>
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-box bg-wall-2 py-1.5 text-paper shadow-[0_0_0_1px_var(--color-edge-hi),0_20px_40px_-16px_rgb(0_0_0/0.8)]">
          {items.map((t, i) => (
            <li
              key={t}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); submit(t); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-1.5 text-[0.95rem] ${i === active ? 'bg-wall-3' : ''}`}
            >
              <Thumb title={t} fallback="dark" className="h-11 w-[2.1rem] shrink-0 rounded-[2px]" />
              <span><Highlight text={t} query={value} /></span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function Highlight({ text, query }) {
  const q = query.trim().toLowerCase();
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<span className="font-semibold text-white">{text.slice(i, i + q.length)}</span>{text.slice(i + q.length)}</>;
}
