import { useEffect, useRef, useState } from 'react';

/**
 * Subscribes to /api/search/stream (Server-Sent Events). Each store's row fills
 * in as soon as that store answers; nothing waits for the slowest store.
 */
export function useSearchStream(query) {
  const [state, setState] = useState({ stores: [], byStore: {}, finished: false, error: null });
  const esRef = useRef(null);

  useEffect(() => {
    esRef.current?.close();
    if (!query) { setState({ stores: [], byStore: {}, finished: false, error: null }); return; }

    setState({ stores: [], byStore: {}, finished: false, error: null });
    const es = new EventSource(`/api/search/stream?q=${encodeURIComponent(query)}`);
    esRef.current = es;

    es.addEventListener('start', (e) => {
      const { stores } = JSON.parse(e.data);
      setState((s) => ({ ...s, stores, byStore: Object.fromEntries(stores.map((st) => [st.id, { status: 'pending', listings: [] }])) }));
    });
    es.addEventListener('store', (e) => {
      const evt = JSON.parse(e.data);
      setState((s) => ({ ...s, byStore: { ...s.byStore, [evt.store]: evt } }));
    });
    es.addEventListener('done', () => {
      es.close();
      setState((s) => ({ ...s, finished: true }));
    });
    es.onerror = () => {
      // Fires on network loss or a non-200 (e.g. our own rate limit).
      es.close();
      setState((s) => ({
        ...s,
        finished: true,
        error: s.stores.length ? null : 'Search is unavailable right now. Check your connection and try again.',
        byStore: Object.fromEntries(Object.entries(s.byStore).map(([k, v]) =>
          [k, v.status === 'pending' ? { status: 'error', listings: [], error: 'Connection lost' } : v])),
      }));
    };
    return () => es.close();
  }, [query]);

  return state;
}
