import { useEffect, useId, useRef, useState } from 'react';
import { Arrow } from './ui.jsx';
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
      <div className={`flex items-stretch bg-white text-black focus-within:shadow-[0_0_0_3px_rgba(41,141,255,0.45)] ${big ? 'h-14 sm:h-16' : 'h-11'}`}>
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
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-grey-500 focus-visible:outline-none ${big ? 'px-5 text-lg sm:text-xl' : 'px-4 text-base'}`}
        />
        <button
          type="submit"
          aria-label="Find deals"
          className={`group flex shrink-0 items-center bg-blue text-white ${big ? 'gap-3 pl-5' : ''}`}
        >
          {big && <span className="hidden text-[0.95rem] sm:inline">Find deals</span>}
          <span className={`arrow-box flex items-center justify-center ${big ? 'h-full w-14 sm:w-16' : 'h-full w-11'}`}>
            <Arrow className={big ? 'size-5' : 'size-4'} />
          </span>
        </button>
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 border border-t-0 border-grey-300 bg-white py-1 text-black shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)]">
          {items.map((t, i) => (
            <li
              key={t}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); submit(t); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3.5 px-4 py-2 text-base ${i === active ? 'bg-grey-100' : ''}`}
            >
              <Thumb title={t} className={`h-12 w-9 shrink-0 ${i === active ? 'outline-2 outline-blue' : ''}`} />
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
  return <>{text.slice(0, i)}<span className="text-blue">{text.slice(i, i + q.length)}</span>{text.slice(i + q.length)}</>;
}
