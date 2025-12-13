
import { SearchResult } from "@/renderer/types"
import { nativeImage } from 'electron';
import path from 'path';


const fileIcons = {
  folder: new URL("../../Assets/fileIcons/folder.svg", import.meta.url).href,
  image: new URL("../../Assets/fileIcons/image.svg", import.meta.url).href,
  video: new URL("../../Assets/fileIcons/video.svg", import.meta.url).href,
  audio: new URL("../../Assets/fileIcons/audio.svg", import.meta.url).href,
  document: new URL("../../Assets/fileIcons/document.svg", import.meta.url).href,
  spreadsheet: new URL("../../Assets/fileIcons/spreadsheet.svg", import.meta.url).href,
  code: new URL("../../Assets/fileIcons/code.svg", import.meta.url).href,
  default: new URL("../../Assets/fileIcons/default.svg", import.meta.url).href,
} as const;

type IconKey = keyof typeof fileIcons;

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


interface ResolveIconProps {
  item: SearchResult & { index: number; };
}

const systemIconCache = new Map<string, string>();

const ResolveIcon = async ({ item }: ResolveIconProps) => {
  if (item.source === "local" && item.path) {
    try {
      // Return cached icon if available
      if (systemIconCache.has(item.path)) {
        return systemIconCache.get(item.path)!;
      }

      // Fetch system icon from Electron API
      const systemIcon = await window.api.getSystemIcon(item.path);

      if (systemIcon) {
        systemIconCache.set(item.path, systemIcon); // cache it
        return systemIcon;
      }

    } catch (err) {
      console.error("Error fetching system icon:", err);
    }
  } else if(item.source === "drive") {
    const IconKey = determineIconKey(item);
    return fileIcons[IconKey];
  }

  // fallback
  return fileIcons.default;
}

export default ResolveIcon