import { useEffect, useRef, useState } from "react";
import type { Entry } from "../types/entry";

interface UseEntrySearchOptions {
  delay?: number;            // ms
  enabled?: boolean;         // you can turn it off for offline mode etc.
}

/**
 * Debounces the query and searches through in-memory entries.
 * The latest‑query guard prevents out‑of‑order responses from flashing old data.
 */
export function useEntrySearch(
  query: string,
  entries: Entry[],
  { delay = 150, enabled = true }: UseEntrySearchOptions = {}
) {
  const [results, setResults] = useState<Entry[]>([]);
  const latestRequest = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const t = setTimeout(() => {
      const stamp = Date.now();
      latestRequest.current = stamp;

      // Perform client-side search
      const searchResults = performSearch(query, entries);
      
      if (latestRequest.current === stamp) {
        setResults(searchResults);
      }
    }, delay);

    return () => clearTimeout(t);
  }, [query, entries, delay, enabled]);

  return results;
}

/**
 * Perform a case-insensitive search through entries
 * Searches both entry names and content
 */
function performSearch(query: string, entries: Entry[]): Entry[] {
  if (!query.trim()) {
    return [];
  }

  const searchTerm = query.toLowerCase();
  
  return entries.filter(entry => {
    // Search in entry name
    if (entry.name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search in entry content
    if (entry.content && entry.content.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    return false;
  });
}
