import React, { useEffect, useState } from "react";
import { useSearch } from "../hooks/useSearch";

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

  const [selected, setSelected] = useState(0);

  return (
    <div className="w-full h-full flex items-start justify-center">
      <div className="w-full rounded-2xl bg-[#fafafa] shadow-md border border-[#e5e5e5] overflow-hidden">
        
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#eaeaea]">
          <input
            autoFocus
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[24px] text-[#121212] placeholder:text-[#9b9b9b] focus:outline-none font-medium"
          />
          <span className="text-[20px] text-[#7a7a7a] border border-[#dcdcdc] rounded-md px-1.5 py-[1px]">
            esc
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.drive.length > 0 ? (
            results.drive.map((item, i) => {
              // const Icon = item.icon;
              const isActive = i === selected;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setSelected(i)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isActive ? "bg-[#f0f0f0]" : "hover:bg-[#f6f6f6]"
                  }`}
                >
                  {/* <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-[#000]" : "text-[#555]"
                    }`}
                  /> */}
                  <div className="flex flex-col">
                    <span
                      className={`text-[20px] ${
                        isActive ? "text-[#000]" : "text-[#121212]"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-[15px] text-[#8a8a8a]">
                      {item.metadata?.webViewLink}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center py-12 text-[#8a8a8a] text-[15px]">
              {query ? "No results found" : "Type to start searching..."}
            </div>
          )}
        </div>
      </div>
    {/* </div> */}
 
      {/* <div className="w-700 h-300 bg-blue-400">

      </div>
      <h1>Test</h1> */}
    
      {/* <div className="flex items-center gap-3 bg-white/70 border-zinc-700/30 backdrop-blur-xl border border-white/20  shadow-2xl rounded-2xl px-5 py-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/50">
          <input
            type="text"
            placeholder="Search files, folders, or Drive..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-md"
          />
        </div> */}

    </div>
  );
};

export default Search;
