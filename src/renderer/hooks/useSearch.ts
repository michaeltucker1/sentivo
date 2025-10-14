import React, { useState, useCallback, useRef } from "react";
import { SearchResults } from "../types";

export const useSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ local: [], drive: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Main search function
  const search = useCallback(async (searchQuery: string, limit = 10) => {
    if (!searchQuery.trim()) {
      setResults({ local: [], drive: [] });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await (window as any).api.search(searchQuery, limit);
      if (response.success) {
        setResults(response.data || { local: [], drive: [] });
      } else {
        setError(response.error || "Search failed");
        setResults({ local: [], drive: [] });
      }

    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults({ local: [], drive: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear search results
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults({ local: [], drive: [] });
    setError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clearSearch,
  };
};
