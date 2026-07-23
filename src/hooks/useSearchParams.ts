import React from 'react';

// Keep a list of all active listeners for URL state updates
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

// Intercept window.history pushState and replaceState to trigger react state updates
const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

window.history.pushState = function (...args) {
  originalPushState.apply(this, args);
  notifyListeners();
};

window.history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  notifyListeners();
};

window.addEventListener('popstate', notifyListeners);
window.addEventListener('hashchange', notifyListeners);

export function useSearchParams(): [URLSearchParams, (nextInit: Record<string, string> | URLSearchParams | ((prev: URLSearchParams) => Record<string, string> | URLSearchParams)) => void] {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    const handleChange = () => forceUpdate();
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const searchParams = React.useMemo(() => {
    // Read from search query first, fallback to parsing hash-based query if path is used as SPA routes
    const search = window.location.search;
    if (search) {
      return new URLSearchParams(search);
    }
    // Check if query is inside hash (e.g. #/explore?tab=settings or similar)
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      return new URLSearchParams(hash.substring(qIndex));
    }
    return new URLSearchParams();
  }, [window.location.search, window.location.hash]);

  const setSearchParams = React.useCallback((
    nextInit: Record<string, string> | URLSearchParams | ((prev: URLSearchParams) => Record<string, string> | URLSearchParams)
  ) => {
    const current = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''));
    let next: Record<string, string> | URLSearchParams;

    if (typeof nextInit === 'function') {
      next = nextInit(current);
    } else {
      next = nextInit;
    }

    const nextParams = new URLSearchParams(next);
    const queryString = nextParams.toString();
    const cleanQuery = queryString ? `?${queryString}` : '';

    // Update the hash or pathname preserving the state structure
    const hash = window.location.hash;
    const baseHash = hash.includes('?') ? hash.split('?')[0] : hash;
    
    const newUrl = `${window.location.pathname}${cleanQuery}${baseHash}`;
    window.history.pushState(null, '', newUrl);
  }, []);

  return [searchParams, setSearchParams];
}
