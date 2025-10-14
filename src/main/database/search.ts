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

// MacOS native search provider using Spotlight
export class MacOSSearchProvider implements SearchProvider {
  name = 'macos';

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      // Use mdfind to search using Spotlight index
      const searchQuery = this.buildSpotlightQuery(query);
      const { stdout } = await execAsync(`mdfind -onlyin ~ "${searchQuery}" | head -${limit}`);

      const results: SearchResult[] = [];
      const paths = stdout.trim().split('\n').filter(Boolean);

      for (const path of paths) {
        const stat = await this.getFileStat(path);
        if (stat) {
          results.push({
            id: path,
            name: path.split('/').pop() || path,
            path: path,
            type: stat.isDirectory ? 'folder' : 'file',
            source: 'local',
            score: this.calculateScore(query, path),
            metadata: {
              modifiedTime: stat.mtime.toISOString()
            }
          });
        }
      }

      return results;
    } catch (error) {
      console.error('MacOS search error:', error);
      return [];
    }
  }

  private buildSpotlightQuery(query: string): string {
    // Build a Spotlight query that searches in filename and content
    const terms = query.split(' ').filter(Boolean);
    return terms.map(term => `kMDItemDisplayName == "*${term}*cdw" || kMDItemTextContent == "*${term}*cdw"`).join(' && ');
  }

  private async getFileStat(path: string) {
    try {
      const { stdout } = await execAsync(`stat -f "%m %d" "${path}" 2>/dev/null || echo "0 0"`);
      const [mtimeStr, isDirStr] = stdout.trim().split(' ');
      return {
        mtime: new Date(parseInt(mtimeStr) * 1000),
        isDirectory: isDirStr === '1'
      };
    } catch {
      return null;
    }
  }

  private calculateScore(query: string, path: string): number {
    const name = path.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (name.includes(queryLower)) {
      return 100;
    }

    // Word matches get medium score
    const queryWords = queryLower.split(' ');
    let wordMatches = 0;
    for (const word of queryWords) {
      if (name.includes(word)) {
        wordMatches++;
      }
    }

    if (wordMatches > 0) {
      return 50 + (wordMatches / queryWords.length) * 40;
    }

    // Partial matches get lower score
    let partialMatches = 0;
    for (const word of queryWords) {
      for (let i = 1; i <= word.length; i++) {
        if (name.includes(word.substring(0, i))) {
          partialMatches++;
          break;
        }
      }
    }

    return Math.max(10, partialMatches * 5);
  }
}

// Google Drive search provider
export class GoogleDriveSearchProvider implements SearchProvider {
  name = 'drive';

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM google_drive
      WHERE name LIKE ?
      ORDER BY
        CASE
          WHEN name LIKE ? THEN 1
          WHEN name LIKE ? THEN 2
          ELSE 3
        END,
        modifiedTime DESC
      LIMIT ?
    `);

    const searchPattern = `%${query}%`;
    const exactPattern = `${query}%`;
    const startPattern = `%${query}`;

    const files = stmt.all(searchPattern, exactPattern, startPattern, limit) as GoogleDriveFile[];

    return files.map(file => ({
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
    // Word matches get lower score
    else {
      const queryWords = queryLower.split(' ');
      let wordMatches = 0;
      for (const word of queryWords) {
        if (nameLower.includes(word)) {
          wordMatches++;
        }
      }
      score = Math.max(20, wordMatches * 15);
    }

    // Boost score for recently modified files
    if (modifiedTime) {
      const modTime = new Date(modifiedTime);
      const daysSinceModified = (Date.now() - modTime.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceModified < 1) {
        score += 10; // Boost for files modified today
      } else if (daysSinceModified < 7) {
        score += 5; // Boost for files modified this week
      }
    }

    return Math.min(score, 100);
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
export async function search(query: string, limit = 10): Promise<{local: SearchResult[], drive: SearchResult[]}> {
  if (!query.trim()) {
    return { local: [], drive: [] };
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

  // Rank and combine results
  const rankedResults = SearchResultRanker.rankAndCombineResults(results);

  // Split results by source
  const localResults = rankedResults.filter(r => r.source === 'local').slice(0, limit);
  const driveResults = rankedResults.filter(r => r.source === 'drive').slice(0, limit);

  return {
    local: localResults,
    drive: driveResults
  };
}

// Utility functions for extending search functionality


