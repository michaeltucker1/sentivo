import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearch } from "../../hooks/useSearch";
import type { SearchResult } from "../../types";
import Icon from "../global/Icon";
import UpdateBadge from "../UpdateBadge";
import SearchItem from "./SearchItem";

const MAX_VISIBLE_RESULTS = 10;

const Search: React.FC = () => {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    debouncedSearch,
    clearSearch,
  } = useSearch();

  const [selected, setSelected] = useState(0);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [appIcons, setAppIcons] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (query.trim().length > 0) {
      debouncedSearch(query);
    } else {
      clearSearch();
    }
  }, [query, debouncedSearch, clearSearch]);

  const visibleResults = useMemo(
    () => results.slice(0, MAX_VISIBLE_RESULTS),
    [results]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    clearSearch();
    setSelected(0);
  }, [clearSearch]);

  const handleToggleSettings = useCallback(async () => {
    try {
      await window.api.toggleSettingsWindow();
    } catch (error) {
      console.error("Failed to toggle settings window:", error);
    }
  }, []);

  const handleCloseWindow = useCallback(async () => {
    try {
      await window.api.hideSearchWindow();
    } catch (error) {
      console.error("Failed to hide search window:", error);
    }
  }, []);

  // Keyboard navigation
  const handleOpenResult = useCallback(
    async (item: SearchResult | undefined) => {
      if (!item) return;

      try {
        if (item.source === "drive" && item.metadata?.webViewLink) {
          await window.api.openExternalUrl(item.metadata.webViewLink);
        } else if (item.source === "local" && item.path) {
          await window.api.openLocalPath(item.path);
        }
      } catch (err) {
        console.error("Failed to open item:", err);
      }
    },
    []
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const hasResults = visibleResults.length > 0;

      if (e.key === "ArrowDown") {
        if (!hasResults) return;
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, visibleResults.length - 1));
      } else if (e.key === "ArrowUp") {
        if (!hasResults) return;
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        const isEmpty = query.trim().length === 0;
        handleClear();
        if (isEmpty) {
          void handleCloseWindow();
        }
      } else if (e.key === "Enter") {
        if (!hasResults) return;
        e.preventDefault();
        void handleOpenResult(visibleResults[selected]);
      }
    },
    [visibleResults, selected, handleClear, handleOpenResult, handleCloseWindow, query]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleWindowBlur = () => {
      void handleCloseWindow();
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [handleCloseWindow]);

  useEffect(() => {
    const node = resultRefs.current[selected];
    if (node) {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selected, visibleResults]);

  // Resize window based on results
  useEffect(() => {
    const resizeWindow = async () => {
      if (query.trim().length === 0) {
        // No query - collapse to minimal height
        await (window.api as any).resizeSearchWindow(86);
        return;
      }

      // Don't resize while loading to prevent bouncing
      if (loading) {
        return;
      }

      if (visibleResults.length === 0) {
        // No results after search completed - show small height
        await (window.api as any).resizeSearchWindow(130);
        return;
      }

      // Calculate height based on results
      const baseHeight = 85; 
      const maxResults = 10; 
      const resultCount = Math.min(visibleResults.length, maxResults);
      const resultsHeight = resultCount * 50;
      const totalHeight = baseHeight + resultsHeight;
      
      await (window.api as any).resizeSearchWindow(totalHeight);
    };

    resizeWindow().catch(console.error);
  }, [loading, error, visibleResults]);

  return (
    <div className="search-window w-full h-full flex flex-col rounded-2xl">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 px-3.5 py-3.5 flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Icon name="search" size={20} className="dark:text-neutral-400 text-[#47474A]" />
          <input
            autoFocus
            type="text"
            placeholder="Search your cloud and files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[16px] dark:text-neutral-400 dark:placeholder:text-neutral-400 text-[#47474A] focus:outline-none font-normal"
          />
        </div>
        {query && (
          <span
            onClick={handleClear}
            className="text-[12px] dark:text-neutral-400 text-[#47474A] rounded-md px-2 py-[2px] dark:bg-[rgba(85,85,85,0.4)] bg-[#B6B6BB]"
          >
            esc
          </span>
        )}
      </div>

      {/* Results */}
      {query.trim().length > 0 && (
        <div className="w-full max-h-[85vh]">
          {error && (
            <div className="px-6 py-6 text-red-500 text-[15px]">
              Something went wrong
            </div>
          )}
          {/* {loading && (
            <div className="px-6 py-4 text-center text-neutral-400 text-[14px] flex items-center justify-center gap-2">
              <div className="w-3 h-3 border border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
              Searching...
            </div>
          )} */}
          {!loading && !error && visibleResults.length === 0 && (
            <div className="pb-5 text-center dark:text-neutral-400 text-[#47474A] text-[14px]">
              No results found
            </div>
          )}
          {!loading && !error && visibleResults.length > 0 && (
            <div className="flex flex-col">
              {visibleResults.map((item, index) => (
                <SearchItem
                  key={item.id}
                  item={{ ...item, index }}
                  isActive={index === selected}
                  handleOpenResult={handleOpenResult}
                  resultRefs={resultRefs}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar */}
      <div className="absolute bottom-0 w-full mt-auto py-1 px-3 flex items-center justify-between dark:bg-[#333333] bg-[#F5F5F5] ">
        <div className="flex items-center p-1 rounded-sm dark:hover:bg-[rgba(85,85,85,0.4)] hover:bg-[#D0D0D3] cursor-pointer" onClick={handleToggleSettings}>
           <Icon name="settings" size={17} className="dark:text-neutral-400 text-[#47474A] "/>
        </div>
        <div className="flex items-center justify-between px-4 py-2">
            <UpdateBadge />
        </div>

        <div className="flex flex-row">

          <div className="flex justify-center items-center dark:bg-[rgba(85,85,85,0.4)] bg-[#D0D0D3] rounded-md px-1 py-[2px]">
            <Icon name="chevron-up" size={15} className="dark:text-neutral-400 text-[#47474A] " />
          </div>

          <div className="text-[10px] dark:text-neutral-400 text-[#47474A] px-2 py-[2px]">
            +
          </div>

          <div
            className="text-[10px] dark:text-neutral-400 text-[#47474A] rounded-md px-2 py-[2px] dark:bg-[rgba(85,85,85,0.4)] bg-[#D0D0D3]">
            Space
          </div>

        </div>
      </div>
    </div>

    
  );
};

export default Search;