import React, { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearch } from "../hooks/useSearch";
import type { SearchResult } from "../types";

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

  useEffect(() => {
    if (query.trim().length > 0) debouncedSearch(query);
    else clearSearch();
  }, [query, debouncedSearch, clearSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        handleClear();
      } else if (e.key === "Enter") {
        const item = results[selected];
        if (!item) return;

        if (item.source === "drive" && item.metadata?.webViewLink) {
          window.open(item.metadata.webViewLink, "_blank");
        } else if (item.path) {
          console.log("Open local item:", item.path);
        }
      }
    },
    [results, selected]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleClear = () => {
    setQuery("");
    clearSearch();
    setSelected(0);
  };

  const renderResultItem = (
    item: SearchResult & { index: number },
    isActive: boolean
  ) => {
    const isDrive = item.source === "drive";
    const sourceLabel = isDrive ? "Google Drive" : "Local";
    const sourceBadgeClass = isDrive
      ? "bg-blue-50 text-blue-600 border-blue-100"
      : "bg-emerald-50 text-emerald-600 border-emerald-100";
    const modifiedLabel = item.metadata?.modifiedTime
      ? formatDistanceToNow(new Date(item.metadata.modifiedTime), {
          addSuffix: true,
        })
      : null;

    return (
      <div
        key={item.id}
        onMouseEnter={() => setSelected(item.index)}
        className={`flex items-center gap-3 px-5 py-3 cursor-pointer rounded-lg transition-all duration-150 ease-out
          ${
            isActive
              ? "bg-neutral-100 shadow-sm ring-1 ring-neutral-300"
              : "hover:bg-neutral-50"
          }`}
      >
        {item.source === "drive" && item.metadata?.thumbnailLink ? (
          <img
            src={item.metadata.thumbnailLink}
            alt=""
            className="w-8 h-8 rounded-md object-cover"
          />
        ) : (
          <div className="w-8 h-8 flex items-center justify-center rounded-md bg-neutral-200 text-neutral-600 text-[15px]">
            {item.type === "folder" ? "📁" : "📄"}
          </div>
        )}

        <div className="flex flex-col overflow-hidden">
          <span
            className={`text-[16px] font-medium truncate ${
              isActive ? "text-neutral-900" : "text-neutral-800"
            }`}
          >
            {item.name}
          </span>
          <div className="flex items-center gap-2 text-[13px] text-neutral-500 truncate">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-[1px] rounded-full border ${sourceBadgeClass}`}
            >
              {sourceLabel}
            </span>
            <span className="truncate">
              {item.source === "local"
                ? item.path
                : item.metadata?.webViewLink}
            </span>
            {modifiedLabel && (
              <span className="whitespace-nowrap">• {modifiedLabel}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalResults = results.length;

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden shadow-sm">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 bg-white px-6 py-4 border-b border-neutral-200 flex items-center gap-3">
        <input
          autoFocus
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-[24px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-normal"
        />
        {query && (
          <span
            onClick={handleClear}
            className="text-[16px] text-neutral-500 border border-neutral-300 rounded-md px-2 py-[2px] cursor-pointer hover:bg-neutral-100 transition"
          >
            esc
          </span>
        )}
      </div>

      {/* Empty state */}
      {query.trim().length === 0 && (
        <div className="flex-1" />
      )}

      {/* Results */}
      {query.trim().length > 0 && (
        <div className="w-full max-h-[65vh] overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent">
          {/* {loading && (
            <div className="px-6 py-6 text-neutral-500 text-[15px]">
              Searching...
            </div>
          )} */}
          {error && (
            <div className="px-6 py-6 text-red-500 text-[15px]">
              Something went wrong.
            </div>
          )}
          {!loading && !error && totalResults === 0 && (
            <div className="px-6 py-8 text-center text-neutral-400 text-[15px]">
              No results found.
            </div>
          )}
          {!loading && !error && (
            <div className="flex flex-col gap-1">
              {results.map((item, index) =>
                renderResultItem({ ...item, index }, index === selected)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;