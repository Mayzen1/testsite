"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Coins, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { getTokenStore } from "@/lib/token-store";

export function Header() {
  const [tokens, setTokens] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTokens(getTokenStore().initialize());
  }, []);

  const handleAddTokens = () => {
    getTokenStore().addTokens(5);
    setTokens(getTokenStore().getTokenCount());
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur dark:bg-gray-950/95 dark:border-gray-800">
      <div className="flex h-14 items-center justify-between px-4 max-w-screen-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-orange-500">Fake</span>
          <span className="dark:text-white">My</span>
          <span className="text-orange-500">Ride</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/create" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            Create Route
          </Link>
          <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            How It Works
          </Link>
          <Link href="/how-to-upload" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            How To Upload
          </Link>

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5">
            <Coins className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium dark:text-white">{tokens}</span>
          </div>

          <Button size="sm" onClick={handleAddTokens}>
            Get Free Tokens
          </Button>
        </nav>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">
            <Coins className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-medium dark:text-white">{tokens}</span>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 cursor-pointer"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-3">
          <Link href="/create" className="block text-sm text-gray-600 dark:text-gray-400" onClick={() => setMenuOpen(false)}>
            Create Route
          </Link>
          <Link href="/how-it-works" className="block text-sm text-gray-600 dark:text-gray-400" onClick={() => setMenuOpen(false)}>
            How It Works
          </Link>
          <Link href="/how-to-upload" className="block text-sm text-gray-600 dark:text-gray-400" onClick={() => setMenuOpen(false)}>
            How To Upload
          </Link>
          <Button size="sm" className="w-full" onClick={() => { handleAddTokens(); setMenuOpen(false); }}>
            Get Free Tokens
          </Button>
        </div>
      )}
    </header>
  );
}
