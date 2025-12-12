import { useEffect, useState } from "react";
import { SearchResult } from "../../types";
import ResolveIcon from "../utils/ResolveIcon";
import { formatDistanceToNow } from "date-fns";


const SearchItem: React.FC<{
    
  item: SearchResult & { index: number };
  isActive: boolean;
  handleOpenResult: (item: SearchResult) => void;
  resultRefs: React.RefObject<(HTMLDivElement | null)[]>;

}> = ({ item, isActive, handleOpenResult, resultRefs }) => {
    const [icon, setIcon] = useState<string>("");

  useEffect(() => {
    ResolveIcon({ item }).then((i) => setIcon(i));
  }, [item]);
  

  const isDrive = item.source === "drive";
  const sourceLabel = isDrive ? "Google Drive" : "Local";
  const sourceBadgeClass = isDrive
    ? "bg-blue-50 text-blue-600 border-blue-100"
    : "bg-emerald-50 text-emerald-600 border-emerald-100";

  const modifiedLabel = item.metadata?.modifiedTime
    ? formatDistanceToNow(new Date(item.metadata.modifiedTime), {addSuffix: true,}) : null;

  return (
    <div
      key={item.id}
      ref={(el) => {
        resultRefs.current[item.index] = el;
      }}
      onDoubleClick={() => handleOpenResult(item)}
      className={`flex items-center gap-3 px-5 py-3 h-[50px] ${isActive && "dark:bg-[rgba(85,85,85,0.4)] bg-[#B6B6BB]"}`}>
      <img src={icon} className="max-w-10" draggable={false} />

      <div className="flex flex-row items-center justify-between w-full">
        <span className="text-[12px] font-medium truncate dark:text-white text-[#1D1D1F]">
          {item.name}
        </span>

        <div className="flex items-center gap-2 text-[10px] dark:text-neutral-100 truncate">
          {modifiedLabel && <span>{modifiedLabel} •</span>}

          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-[1px] rounded-full border ${sourceBadgeClass}`}>
            {sourceLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchItem
