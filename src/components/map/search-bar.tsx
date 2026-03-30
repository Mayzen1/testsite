"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "../ui/button";

interface SearchResult {
  place_name: string;
  center: [number, number];
}

interface SearchBarProps {
  onSelect: (lng: number, lat: number) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&limit=5`
        );
        const data = await res.json();
        if (data.features) {
          setResults(
            data.features.map((f: { place_name: string; center: [number, number] }) => ({
              place_name: f.place_name,
              center: f.center,
            }))
          );
          setOpen(true);
        }
      } catch {
        // ignore geocoding errors
      }
    }, 400);
  };

  const handleSelect = (r: SearchResult) => {
    setQuery(r.place_name);
    setOpen(false);
    onSelect(r.center[0], r.center[1]);
  };

  const handleSubmit = () => {
    if (results.length > 0) {
      handleSelect(results[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="Search for a location..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <Button size="icon" variant="secondary" onClick={handleSubmit}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white cursor-pointer"
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
