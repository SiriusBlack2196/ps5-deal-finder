import { useCallback, useEffect, useState } from 'react';
import Home from './components/Home.jsx';
import Results from './components/Results.jsx';

// The query lives in the URL (?q=) so results are shareable and Back works.
const readQuery = () => { try { return new URLSearchParams(location.search).get('q')?.trim() || ''; } catch { return ''; } };
const push = (url) => { try { history.pushState({ inApp: true }, '', url); } catch { /* sandboxed frame */ } };

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

  // Back: previous screen within the app if there is one, otherwise home.
  const back = useCallback(() => {
    let inApp = false;
    try { inApp = Boolean(history.state?.inApp); } catch { /* sandboxed frame */ }
    if (inApp) history.back(); else home();
  }, [home]);

  return query ? <Results query={query} onSearch={search} onHome={home} onBack={back} /> : <Home onSearch={search} />;
}
