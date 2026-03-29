'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  onPlaceSelect: (lng: number, lat: number, name: string) => void;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

export default function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&limit=5`
      );
      const data = await res.json();
      setResults(data.features || []);
      setIsOpen(true);
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative w-80">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
        placeholder="Rechercher un lieu..."
        className="w-full px-4 py-2.5 bg-white rounded-lg shadow-lg border-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg overflow-hidden z-50">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onPlaceSelect(r.center[0], r.center[1], r.place_name);
                setQuery(r.place_name);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
