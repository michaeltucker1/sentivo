import React, { useEffect, useState, useCallback } from "react";
import { useSearch } from "../hooks/useSearch";
import { formatDistanceToNow } from "date-fns";

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

  // Run search automatically as user types
  useEffect(() => {
    if (query.trim().length > 0) debouncedSearch(query);
    else clearSearch();
  }, [query, debouncedSearch, clearSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const allResults = [...(results.local || []), ...(results.drive || [])];
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        handleClear();
      } else if (e.key === "Enter" && allResults[selected]) {
        const item = allResults[selected];
        if (item.source === "drive" && item.metadata?.webViewLink) {
          window.open(item.metadata.webViewLink, "_blank");
        } else {
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

  const renderResultItem = (item: any, isActive: boolean) => {
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

  const renderSection = (title: string, data: any[], startIndex: number) => (
    <>
      {data.length > 0 && (
        <>
          <div className="sticky top-[0px] bg-white py-2 px-5 text-[13px] text-neutral-500 font-medium uppercase tracking-wide border-b border-neutral-100 z-10">
            {title}
          </div>
          {data.map((item, i) =>
            renderResultItem(
              { ...item, index: startIndex + i },
              startIndex + i === selected
            )
          )}
        </>
      )}
    </>
  );

  const totalResults = (results.local?.length || 0) + (results.drive?.length || 0);

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
          {loading && (
            <div className="px-6 py-6 text-neutral-500 text-[15px]">
              Searching...
            </div>
          )}
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
            <>
              {renderSection("Local", results.local || [], 0)}
              {renderSection(
                "Google Drive",
                results.drive || [],
                (results.local?.length || 0)
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;