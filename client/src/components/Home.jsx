import { useEffect, useState } from 'react';
import SearchBox from './SearchBox.jsx';
import { Arrow, Marker } from './ui.jsx';

export default function Home({ onSearch }) {
  const [popular, setPopular] = useState([]);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    fetch('/api/popular').then((r) => r.json()).then(setPopular).catch(() => {});
    fetch('/api/stores').then((r) => r.json()).then(setStores).catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh bg-black">
      <section className="glow relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:pb-28">
          <nav className="flex h-12 items-center gap-2.5">
            <Marker />
            <span className="text-[0.95rem]">PS5 Deal Finder</span>
          </nav>

          <h1 className="display reveal mt-16 max-w-[11ch] text-[3.25rem] sm:mt-24 sm:text-[5.6rem]">
            The cheapest PS5 disc in India
          </h1>
          <p className="mt-5 max-w-[38ch] text-lg text-grey-400 sm:text-xl">
            One search compares new and pre-owned prices across Indian game stores.
          </p>

          <div className="mt-10 max-w-2xl">
            <SearchBox onSearch={onSearch} autoFocus />
          </div>

          {stores.length > 0 && (
            <ul className="meta mt-6 flex flex-wrap gap-x-5 gap-y-2 text-grey-400" aria-label="Stores checked">
              {stores.map((s) => (
                <li key={s.id} className="flex items-center gap-2"><span className="size-1.5 bg-blue" aria-hidden="true" />{s.name}</li>
              ))}
              <li className="flex items-center gap-2 text-grey-600"><span className="size-1.5 bg-grey-700" aria-hidden="true" />Amazon and Flipkart next</li>
            </ul>
          )}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="bg-white text-black" aria-labelledby="popular-h">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-10 sm:py-20">
            <h2 id="popular-h" className="display text-[2.25rem] sm:text-[2.75rem]">Popular right now</h2>
            <ul className="mt-8 grid grid-cols-1 border-t border-grey-300 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((g) => (
                <li key={g} className="border-b border-grey-300 sm:[&:nth-child(odd)]:border-r lg:border-r lg:[&:nth-child(4n)]:border-r-0">
                  <button onClick={() => onSearch(g)} className="group flex w-full items-center justify-between gap-4 py-5 text-left sm:px-5 sm:py-7">
                    <span className="text-lg leading-snug">{g}</span>
                    <span className="arrow-box flex size-9 shrink-0 items-center justify-center bg-grey-100 text-black transition-colors duration-300 group-hover:bg-blue group-hover:text-white">
                      <Arrow />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <footer className="mx-auto max-w-6xl px-5 py-10 sm:px-10">
        <div className="dots-x on-dark" />
        <p className="meta mt-6 max-w-[60ch] text-grey-500">
          Prices come from each store's public listings and can change. Check the final price at checkout.
        </p>
      </footer>
    </div>
  );
}
