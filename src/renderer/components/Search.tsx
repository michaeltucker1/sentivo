import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearch } from "../hooks/useSearch";
import type { SearchResult } from "../types";
import Icon from "./global/Icon";

const UpdateBadge = () => {
  const [updateAvailable, setUpdateAvailable] = useState(true);
  const [version, setVersion] = useState("1.0.1");

  useEffect(() => {
    // Type assertion to access the api object with any type
    const api = window.api as any;
    
    const handleUpdateAvailable = (_event: any, info: { version: string }) => {
      setUpdateAvailable(true);
      setVersion(info.version);
    };

    const handleUpdateNotAvailable = () => {
      setUpdateAvailable(false);
    };

    // Register event listeners
    api.onUpdateAvailable(handleUpdateAvailable);
    
    // Listen for update-not-available event through error handler
    api.onError((_event: any, error: Error) => {
      if (error?.message?.includes('update-not-available')) {
        handleUpdateNotAvailable();
      }
    });

    // Initial check
    api.getUpdateStatus().then((status: { isUpdateAvailable: boolean; version?: string }) => {
      if (status.isUpdateAvailable && status.version) {
        setUpdateAvailable(true);
        setVersion(status.version);
      } else {
        setUpdateAvailable(false);
      }
    });

    // Cleanup function to remove event listeners
    return () => {
      // Remove the listeners we added
      api.onUpdateAvailable(() => {});
      api.onError(() => {});
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="flex items-center justify-center px-2 py-0.5 text-xs text-white bg-blue-400 rounded-full">
      Update v{version} available
    </div>
  );
};

const fileIconMap = {
  folder: new URL("../Assets/fileIcons/folder.svg", import.meta.url).href,
  image: new URL("../Assets/fileIcons/image.svg", import.meta.url).href,
  video: new URL("../Assets/fileIcons/video.svg", import.meta.url).href,
  audio: new URL("../Assets/fileIcons/audio.svg", import.meta.url).href,
  document: new URL("../Assets/fileIcons/document.svg", import.meta.url).href,
  spreadsheet: new URL("../Assets/fileIcons/spreadsheet.svg", import.meta.url).href,
  code: new URL("../Assets/fileIcons/code.svg", import.meta.url).href,
  default: new URL("../Assets/fileIcons/default.svg", import.meta.url).href,
} as const;

type IconKey = keyof typeof fileIconMap;

const imageExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "svg",
]);
const videoExtensions = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "flv",
]);
const audioExtensions = new Set(["mp3", "wav", "aac", "flac", "ogg", "m4a"]);
const codeExtensions = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "java",
  "cs",
  "cpp",
  "c",
  "php",
  "html",
  "css",
  "scss",
  "json",
  "yml",
  "yaml",
  "md",
  "sh",
]);
const documentExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "rtf",
  "md",
  "ppt",
  "pptx",
]);
const spreadsheetExtensions = new Set(["xls", "xlsx", "csv", "ods", "tsv"]);

const getExtension = (path?: string) => {
  if (!path) return "";
  const lastSegment = path.split("/").pop();
  const ext = lastSegment?.split(".").pop();
  return ext?.toLowerCase() ?? "";
};

const getIconKeyFromMime = (mime?: string): IconKey | null => {
  if (!mime) return null;
  const lower = mime.toLowerCase();

  if (lower === "application/vnd.google-apps.folder") return "folder";
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("video/")) return "video";
  if (lower.startsWith("audio/")) return "audio";
  if (lower.includes("spreadsheet") || lower.includes("sheet")) return "spreadsheet";
  if (lower.includes("presentation")) return "document";
  if (
    lower === "application/pdf" ||
    lower === "application/msword" ||
    lower === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower === "text/plain" ||
    lower === "text/markdown" ||
    lower === "application/vnd.google-apps.document"
  ) {
    return "document";
  }
  if (
    lower.includes("json") ||
    lower.includes("javascript") ||
    lower.includes("typescript") ||
    lower.includes("x-python") ||
    lower.includes("x-sh") ||
    lower.includes("x-ruby")
  ) {
    return "code";
  }

  return null;
};

const determineIconKey = (item: SearchResult): IconKey => {
  if (item.type === "folder") {
    return "folder";
  }

  const mimeTypeKey = getIconKeyFromMime(item.metadata?.mimeType);
  if (mimeTypeKey) {
    return mimeTypeKey;
  }

  const extension = getExtension(item.path);

  if (imageExtensions.has(extension)) return "image";
  if (videoExtensions.has(extension)) return "video";
  if (audioExtensions.has(extension)) return "audio";
  if (spreadsheetExtensions.has(extension)) return "spreadsheet";
  if (documentExtensions.has(extension)) return "document";
  if (codeExtensions.has(extension)) return "code";

  return "default";
};

const MAX_VISIBLE_RESULTS = 8;

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

  useEffect(() => {
    if (query.trim().length > 0) debouncedSearch(query);
    else clearSearch();
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
        ref={(el) => {
          resultRefs.current[item.index] = el;
        }}
        // onMouseEnter={() => setSelected(item.index)}
        onDoubleClick={() => void handleOpenResult(item)}
        className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-all duration-150 ease-out select-none
          ${
            isActive && "bg-neutral-200"

          }`}
      >
        <img
          src={fileIconMap[determineIconKey(item)]}
          alt={`${item.source} ${item.type}`}
          className="w-7 h-7"
        />

        <div className="flex flex-col overflow-hidden">
          <span
            className={`text-[13px] font-medium truncate ${
              isActive ? "text-neutral-900" : "text-neutral-800"
            }`}
          >
            {item.name}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-neutral-500 truncate">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-[1px] rounded-full border ${sourceBadgeClass}`}
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

  const totalResults = visibleResults.length;

  return (
    <div className="search-window w-full h-full flex flex-col bg-white rounded-2xl overflow-hidden">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 bg-white px-6 py-3 border-b border-neutral-200 flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Icon name="search" size={24} className="text-neutral-400" />
          <input
            autoFocus
            type="text"
            placeholder="Sentivo Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[20px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-normal"
          />
        </div>
        {query && (
          <span
            onClick={handleClear}
            className="text-[12px] text-neutral-400 border border-neutral-300 rounded-md px-2 py-[2px] cursor-pointer hover:bg-neutral-100 transition"
          >
            esc
          </span>
        )}
      </div>

      {/* Results */}
      {query.trim().length > 0 && (
        <div className="w-full max-h-[65vh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent border-b border-neutral-200">
          {error && (
            <div className="px-6 py-6 text-red-500 text-[15px]">
              Something went wrong.
            </div>
          )}
          {!loading && !error && totalResults === 0 && (
            <div className="px-6 py-7 text-center text-neutral-400 text-[20px]">
              No results found.
            </div>
          )}
          {!loading && !error && visibleResults.length > 0 && (
            <div className="flex flex-col">
              {visibleResults.map((item, index) =>
                renderResultItem({ ...item, index }, index === selected)
              )}
            </div>
          )}
        </div>
      )}
      {/* Bottom Bar with Logo */}
      <div className="mt-auto py-1 px-5.5 flex items-center justify-between">
        <div className="flex items-center p-1.5 rounded-sm hover:bg-neutral-100 cursor-pointer" onClick={handleToggleSettings}>
           <Icon name="settings" size={17} className="text-neutral-400"/>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-white">
            <UpdateBadge />
        </div>

        <div className="flex flex-row">

          <div className="flex justify-center items-center border border-neutral-300 bg-white rounded-md px-1 py-[2px]">
            <Icon name="chevron-up" size={15} className="text-neutral-400" />
          </div>

          <div className="text-[10px] text-neutral-400 px-2 py-[2px]">
            +
          </div>

          <div
            className="text-[10px] text-neutral-400 border 
                      border-neutral-300 rounded-md px-2 py-[2px] bg-white">
            Space
          </div>

        </div>
      </div>
    </div>

    
  );
};

export default Search;