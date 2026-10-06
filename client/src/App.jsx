import { useCallback, useEffect, useState } from 'react';
import Home from './components/Home.jsx';
import Results from './components/Results.jsx';

// The query lives in the URL (?q=) so results are shareable and Back works.
const readQuery = () => { try { return new URLSearchParams(location.search).get('q')?.trim() || ''; } catch { return ''; } };
const push = (url) => { try { history.pushState(null, '', url); } catch { /* sandboxed frame */ } };

export default function App() {
  const [query, setQuery] = useState(readQuery);

  useEffect(() => {
    const onPop = () => setQuery(readQuery());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.title = query ? `${query} — PS5 Deal Finder` : 'PS5 Deal Finder';
  }, [query]);

  const search = useCallback((q) => {
    push(`?q=${encodeURIComponent(q)}`);
    setQuery(q);
    scrollTo(0, 0);
  }, []);

  const home = useCallback(() => {
    push(location.pathname);
    setQuery('');
  }, []);

  return query ? <Results query={query} onSearch={search} onHome={home} /> : <Home onSearch={search} />;
}
