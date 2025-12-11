import React, { useState, useCallback, useRef, useEffect } from "react";
import { SearchResults } from "../types";

export const useSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInitiated, setSearchInitiated] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Main search function
  const search = useCallback(async (searchQuery: string, limit = 10) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      setSearchInitiated(false);
      return;
    }

    try {
      // Loading state is now managed in debouncedSearch
      const response = await window.api.search(searchQuery, limit);
      setResults(response ?? []);

    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((searchQuery: string, delay = 350) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only set loading if there's a query to search for
    if (searchQuery.trim()) {
      setLoading(true);
      setError(null);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      search(searchQuery);
    }, delay);
  }, [search]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setLoading(false);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    debouncedSearch,
    clearSearch,
  };
};
