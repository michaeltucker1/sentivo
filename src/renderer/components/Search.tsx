import React, { useEffect, useState } from "react";
import { useSearch } from "../hooks/useSearch";
import { SearchResult } from "../types";

const SearchResultItem: React.FC<{ result: SearchResult }> = ({ result }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  const getSourceIcon = (source: string) => {
    return source === 'local' ? '💻' : '☁️';
  };

  const getFileIcon = (type: string, mimeType?: string) => {
    if (type === 'folder') return '📁';

    // File type icons based on mime type
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('document') || mimeType?.includes('text')) return '📝';
    if (mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('presentation')) return '📋';
    if (mimeType?.includes('video')) return '🎥';
    if (mimeType?.includes('audio')) return '🎵';

    return '📄'; // Default file icon
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <div className="flex-shrink-0 text-2xl">
          {getFileIcon(result.type, result.metadata?.mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {result.name}
          </h4>
          {result.path && (
            <p className="text-xs text-gray-500 truncate mt-1">
              {result.path}
            </p>
          )}
          {result.metadata?.mimeType && (
            <p className="text-xs text-gray-400 mt-1">
              {result.metadata.mimeType}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-3 flex-shrink-0">
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-400">
            {getSourceIcon(result.source)}
          </span>
          <span className="text-xs text-gray-500 capitalize">
            {result.source}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {formatDate(result.metadata?.modifiedTime)}
        </span>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          {result.score}% match
        </span>
      </div>
    </div>
  );
};

const Search: React.FC = () => {
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clearSearch,
  } = useSearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  useEffect(() => {
    if (query.length > 0) {
      search(query);
    }
  }, [query])

  useEffect(() => {
    console.log(results)
  }, [results])

  const handleClear = () => {
    setQuery("");
    clearSearch();
  };

  return (
    <div className="w-full h-full">
      {/* dark:bg-zinc-900/70 dark:border-zinc-700/30*/}
      <div className="flex items-center gap-3 bg-white/70 border-zinc-700/30 backdrop-blur-xl border border-white/20  shadow-2xl rounded-2xl px-5 py-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/50">
          {/* <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" /> */}
          <input
            type="text"
            placeholder="Search files, folders, or Drive..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            // dark:text-gray-100 dark:placeholder-gray-400
            className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-md"
          />
        </div>

    </div>
  );
};

export default Search;
