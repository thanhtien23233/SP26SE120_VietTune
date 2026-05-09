import { useState, useEffect } from 'react';

export function useEntitySearch(initialSearch: string = '', delayMs: number = 300) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delayMs]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
  };
}
