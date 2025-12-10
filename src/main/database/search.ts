import { exec } from 'child_process';
import { promisify } from 'util';
import { getDatabase } from './db.js';
import { GoogleDriveFile } from './googleDriveIndex.js';

const execAsync = promisify(exec);

// Types for search results
export interface SearchResult {
  id: string;
  name: string;
  path?: string;
  type: 'file' | 'folder';
  source: 'local' | 'drive';
  score: number;
  metadata?: {
    mimeType?: string;
    modifiedTime?: string;
    thumbnailLink?: string;
    webViewLink?: string;
  };
}

export interface SearchProvider {
  name: string;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

// Simple in-memory cache for search results
interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
  query: string;
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 30000; // 30 seconds TTL

  get(query: string, provider: string): SearchResult[] | null {
    const key = this.getKey(query, provider);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.results;
  }

  set(query: string, provider: string, results: SearchResult[]): void {
    const key = this.getKey(query, provider);
    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      query
    });

    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  clearProvider(provider: string): void {
    const prefix = `${provider}:`;
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  private getKey(query: string, provider: string): string {
    return `${provider}:${query}`;
  }
}

const searchCache = new SearchCache();

// Files and directories to exclude from search results
const EXCLUDED_PATTERNS = [
  // System directories
  /^\/private\//,
  /^\/usr\//,
  /^\/bin\//,
  /^\/sbin\//,
  /^\/etc\//,
  /^\/var\//,
  /^\/tmp\//,
  
  // User system directories
  // /^\/Users\/[^\/]+\/Library\//,
  // /^\/Users\/[^\/]+\/\./,
  
  // Common config and cache directories
  /node_modules\//,
  /\.git\//,
  /\.svn\//,
  /\.hg\//,
  /__pycache__\//,
  /target\//,
  /build\//,
  /dist\//,
  /\.vscode\//,
  /\.idea\//,
  
  // Config files
  /\.env$/,
  /\.config$/,
  /\.ini$/,
  /\.conf$/,
  /\.cfg$/,
  /\.toml$/,
  /\.yaml$/,
  /\.yml$/,
  /\.json$/,
  /\.lock$/,
  /\.log$/,
  
  // System files
  /\.DS_Store$/,
  /\.localized$/,
  /\.Trashes$/,
  /\.fseventsd$/,
  /\.Spotlight-V100$/,
  /\.TemporaryItems$/,
  /\.VolumeIcon.icns$/,
  
  // Development artifacts
  /\.pyc$/,
  /\.pyo$/,
  /\.class$/,
  /\.o$/,
  /\.so$/,
  /\.dylib$/,
  /\.dll$/,
  /\.exe$/,
  
  // Hidden files and temp files
  /^\./,
  /~$/,
  /\.tmp$/,
  /\.temp$/,
  /\.swp$/,
  /\.swo$/,
  
  // Package manager files
  /package-lock\.json$/,
  /yarn\.lock$/,
  /Pipfile\.lock$/,
  /Gemfile\.lock$/,
  
  // IDE files
  /\.vscode\//,
  /\.idea\//,
  /\.sublime-/,
  /\.atom\//,
];

// Check if a file should be included in search results
function shouldIncludeFile(filePath: string): boolean {
  // Check against all exclusion patterns
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }
  
  // Additional checks for user-relevant files
  const fileName = filePath.split('/').pop() || '';
  
  // Include common user file types
  const userFileExtensions = [
    'txt', 'md', 'doc', 'docx', 'pdf', 'rtf',
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
    'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav',
    'xls', 'xlsx', 'csv', 'ppt', 'pptx',
    'app', 'dmg', 'pkg',
    'zip', 'tar', 'gz', 'rar'
  ];
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Include if it has a user-relevant extension or is an app
  if (extension && (userFileExtensions.includes(extension) || extension === 'app')) {
    return true;
  }
  
  // Include files without extension that are likely user files (like README)
  if (!extension && /^[A-Za-z][A-Za-z0-9_-]*$/.test(fileName)) {
    return true;
  }
  
  // Include folders in user directories (but not system folders)
  if (!filePath.includes('.') && !filePath.match(/^\/(System|Library|usr|bin|sbin|etc|var|tmp)/)) {
    return true;
  }
  
  return false;
}

export function clearSearchCache(provider?: string) {
  if (provider) {
    searchCache.clearProvider(provider);
  } else {
    searchCache.clear();
  }
}

// MacOS native search provider using Spotlight
export class MacOSSearchProvider implements SearchProvider {
  name = 'macos';

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    // Check cache first
    const cachedResults = searchCache.get(query, this.name);
    if (cachedResults) {
      console.log(`Cache hit for query: ${query}`);
      return cachedResults;
    }

    try {
      // Use Spotlight to search more files since we'll filter them
      // Get more results than needed to account for filtering
      const searchLimit = Math.max(limit * 3, 20); // Get 3x more results, minimum 50
      const { stdout } = await execAsync(`mdfind -name "${query}" | head -${searchLimit}`);

      const paths = stdout.trim().split('\n').filter(Boolean);
      const results: SearchResult[] = [];

      for (const path of paths) {
        try {
          // Filter out system files and directories
          if (!shouldIncludeFile(path)) {
            continue;
          }
          
          const stat = await this.getFileStat(path);
          if (!stat) continue;

          results.push({
            id: path,
            name: path.split('/').pop() || path,
            path,
            type: stat.isDirectory ? 'folder' : 'file',
            source: 'local',
            score: this.calculateScore(query, path),
            metadata: { modifiedTime: stat.mtime.toISOString() }
          });
        } catch {
          // Skip unreadable files
          continue;
        }
      }

      // Sort results by score (highest first) before returning
      results.sort((a, b) => b.score - a.score);
      
      // Return only the requested number of results after filtering and sorting
      const finalResults = results.slice(0, limit);
      searchCache.set(query, this.name, finalResults);
      return finalResults;
    } catch (error) {
      console.error('MacOS search error:', error);
      
      // Check for permission denied errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Operation not permitted') || 
          errorMessage.includes('Permission denied') ||
          errorMessage.includes('mdfind')) {
          console.warn('Local search requires Full Disk Access permission. Please grant it in System Preferences > Security & Privacy > Privacy > Full Disk Access');
      }
      
      return [];
    }
  }

  private async getFileStat(path: string) {
    try {
      const { stdout } = await execAsync(`stat -f "%m %HT" "${path}" 2>/dev/null || echo "0 0"`);
      const [mtimeStr, typeStr] = stdout.trim().split(' ');
      return {
        mtime: new Date(parseInt(mtimeStr) * 1000),
        isDirectory: typeStr === 'Directory'
      };
    } catch {
      return null;
    }
  }

  private calculateScore(query: string, path: string): number {
    const name = path.toLowerCase();
    const q = query.toLowerCase();
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Base score calculation
    let baseScore = 0;

    // Exact match bonus
    if (name === q) baseScore = 99;
    else if (name.endsWith(`/${q}`)) baseScore = 95;
    else if (name.includes(q)) baseScore = 85;
    else {
      // Basic word match boost
      const words = q.split(/\s+/);
      const matches = words.filter(w => name.includes(w)).length;
      baseScore = matches > 0 ? Math.min(60 + matches * 10, 90) : 40;
    }

    // File type ranking (multiplier)
    let typeMultiplier = 1.0;

    // Apps are always highest priority
    if (extension === 'app') {
      typeMultiplier = 1.5; // 50% boost for apps
    }
    // User documents get high priority
    else if (['doc', 'docx', 'pdf', 'txt', 'md', 'rtf'].includes(extension)) {
      typeMultiplier = 1.3; // 30% boost for documents
    }
    // Media files get medium-high priority
    else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'mp4', 'mov', 'mp3', 'wav'].includes(extension)) {
      typeMultiplier = 1.2; // 20% boost for media
    }
    // Spreadsheets and presentations
    else if (['xls', 'xlsx', 'csv', 'ppt', 'pptx'].includes(extension)) {
      typeMultiplier = 1.15; // 15% boost for office files
    }
    // Archives and installers
    else if (['zip', 'tar', 'gz', 'dmg', 'pkg'].includes(extension)) {
      typeMultiplier = 1.1; // 10% boost for archives
    }

    // Directory bonus (folders are useful)
    if (path.endsWith('/') || !path.includes('.')) {
      typeMultiplier *= 1.1; // 10% boost for folders
    }

    // Recency bonus (more recently modified files get higher score)
    try {
      const stats = require('fs').statSync(path);
      const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceModified < 1) {
        typeMultiplier *= 1.2; // 20% boost for files modified today
      } else if (daysSinceModified < 7) {
        typeMultiplier *= 1.1; // 10% boost for files modified this week
      } else if (daysSinceModified < 30) {
        typeMultiplier *= 1.05; // 5% boost for files modified this month
      }
    } catch {
      // If we can't get stats, continue without recency bonus
    }

    // Final score with all multipliers applied
    const finalScore = Math.min(baseScore * typeMultiplier, 100);
    
    return Math.round(finalScore);
  }
}


// Google Drive search provider
export class GoogleDriveSearchProvider implements SearchProvider {
  name = 'drive';

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    // Check cache first
    const cachedResults = searchCache.get(query, this.name);
    if (cachedResults) {
      return cachedResults;
    }

    const db = getDatabase();

    // Use FTS (Full-Text Search) if available, otherwise optimize the LIKE query
    try {
      // Try FTS first for better performance
      const ftsResults = await this.searchWithFTS(query, limit);
      if (ftsResults.length > 0) {
        searchCache.set(query, this.name, ftsResults);
        return ftsResults;
      }
    } catch (error) {
      // FTS not available, fall back to optimized LIKE query
      console.log('FTS not available, using optimized LIKE query');
    }

    // Optimized LIKE query with better indexing
    const stmt = db.prepare(`
      SELECT * FROM google_drive
      WHERE name LIKE ? OR name LIKE ? OR name LIKE ?
      ORDER BY
        CASE
          WHEN name LIKE ? THEN 1
          WHEN name LIKE ? THEN 2
          WHEN name LIKE ? THEN 3
          ELSE 4
        END,
        modifiedTime DESC
      LIMIT ?
    `);

    const searchPattern = `%${query}%`;
    const exactPattern = `${query}%`;
    const startPattern = `%${query}`;

    const files = stmt.all(searchPattern, startPattern, exactPattern, exactPattern, startPattern, searchPattern, limit) as GoogleDriveFile[];

    const results = files.map(file => ({
      id: file.id,
      name: file.name,
      type: this.getFileType(file.mimeType),
      source: 'drive' as const,
      score: this.calculateScore(query, file.name, file.modifiedTime),
      metadata: {
        mimeType: file.mimeType || undefined,
        modifiedTime: file.modifiedTime || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        webViewLink: file.webViewLink || undefined
      }
    }));

    // Cache the results
    searchCache.set(query, this.name, results);

    return results;
  }

  private async searchWithFTS(query: string, limit = 10): Promise<SearchResult[]> {
    // For now, return empty array as FTS is not implemented
    // This could be enhanced later with SQLite FTS extension
    return [];
  }

  private getFileType(mimeType?: string | null): 'file' | 'folder' {
    return mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file';
  }

  private calculateScore(query: string, name: string, modifiedTime?: string | null): number {
    const nameLower = name.toLowerCase();
    const queryLower = query.toLowerCase();

    let score = 0;

    // Exact match gets highest score
    if (nameLower === queryLower) {
      score = 100;
    }
    // Starts with query gets high score
    else if (nameLower.startsWith(queryLower)) {
      score = 90;
    }
    // Contains query gets medium score
    else if (nameLower.includes(queryLower)) {
      score = 70;
    }
    // Word matches get lower score with fuzzy matching
    else {
      const queryWords = queryLower.split(' ');
      let wordMatches = 0;
      let bestFuzzyScore = 0;

      for (const word of queryWords) {
        if (nameLower.includes(word)) {
          wordMatches++;
          bestFuzzyScore = Math.max(bestFuzzyScore, this.fuzzyMatchScore(word, nameLower));
        }
      }

      if (wordMatches > 0) {
        const wordScore = Math.max(20, wordMatches * 15);
        const fuzzyScore = bestFuzzyScore * 10;
        score = wordScore + fuzzyScore;
      } else {
        // Partial fuzzy matching for very loose matches
        let partialMatches = 0;
        let bestPartialFuzzy = 0;

        for (const word of queryWords) {
          for (let i = 1; i <= word.length; i++) {
            const partial = word.substring(0, i);
            if (nameLower.includes(partial)) {
              partialMatches++;
              bestPartialFuzzy = Math.max(bestPartialFuzzy, this.fuzzyMatchScore(partial, nameLower));
              break;
            }
          }
        }

        if (partialMatches > 0) {
          score = Math.max(10, partialMatches * 5 + bestPartialFuzzy * 5);
        }
      }
    }

    // Boost score for recently modified files
    if (modifiedTime && score > 0) {
      const modTime = new Date(modifiedTime);
      const daysSinceModified = (Date.now() - modTime.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceModified < 1) {
        score += 15; // Boost for files modified today
      } else if (daysSinceModified < 7) {
        score += 8; // Boost for files modified this week
      } else if (daysSinceModified < 30) {
        score += 3; // Small boost for files modified this month
      }
    }

    return Math.min(score, 100);
  }

  private fuzzyMatchScore(query: string, target: string): number {
    // Enhanced fuzzy matching with position weighting
    let score = 0;
    let queryIndex = 0;
    let consecutiveMatches = 0;
    let maxConsecutive = 0;

    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        // Bonus for consecutive matches (acronym-like matching)
        if (i > 0 && target[i - 1] === query[queryIndex - 1]) {
          consecutiveMatches++;
        } else {
          consecutiveMatches = 1;
        }

        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
        score += 1;
        queryIndex++;

        // Bonus for matches at word boundaries
        if (i === 0 || target[i - 1] === ' ' || target[i - 1] === '-') {
          score += 0.5;
        }
      } else {
        consecutiveMatches = 0;
      }
    }

    // Bonus for completing the entire query
    const completionBonus = queryIndex === query.length ? 20 : 0;

    // Bonus for long consecutive matches
    const consecutiveBonus = maxConsecutive * 2;

    return Math.min(100, (score / query.length) * 80 + completionBonus + consecutiveBonus);
  }
}

// Search result ranking and deduplication
export class SearchResultRanker {
  static rankAndCombineResults(results: SearchResult[][]): SearchResult[] {
    // Flatten all results
    const allResults = results.flat();

    // Remove duplicates based on path/name similarity
    const uniqueResults = this.removeDuplicates(allResults);

    // Sort by score (descending) and source priority (local > drive for same score)
    return uniqueResults.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.1) {
        // If scores are very close, prefer local results
        if (a.source === 'local' && b.source === 'drive') return -1;
        if (a.source === 'drive' && b.source === 'local') return 1;
      }
      return b.score - a.score;
    });
  }

  private static removeDuplicates(results: SearchResult[]): SearchResult[] {
    const unique = new Map<string, SearchResult>();

    for (const result of results) {
      const key = this.getUniqueKey(result);

      if (unique.has(key)) {
        // Keep the one with higher score
        const existing = unique.get(key)!;
        if (result.score > existing.score) {
          unique.set(key, result);
        }
      } else {
        unique.set(key, result);
      }
    }

    return Array.from(unique.values());
  }

  private static getUniqueKey(result: SearchResult): string {
    if (result.source === 'local' && result.path) {
      return `local:${result.path}`;
    }
    return `${result.source}:${result.id}`;
  }
}

// Main search function
export async function search(query: string, limit = 10): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const providers: SearchProvider[] = [
    new MacOSSearchProvider(),
    new GoogleDriveSearchProvider()
  ];

  // Execute all searches in parallel
  const searchPromises = providers.map(provider =>
    provider.search(query, limit).catch(error => {
      console.error(`${provider.name} search failed:`, error);
      return [];
    })
  );

  const results = await Promise.all(searchPromises);

  // Rank and combine results (already sorted/limited per provider)
  const rankedResults = SearchResultRanker.rankAndCombineResults(results);

  // Limit total results returned to maintain consistent payload size
  return rankedResults.slice(0, limit * providers.length);
}

// Utility functions for extending search functionality


