"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "SPY", name: "S&P 500 ETF" },
] as const;

interface TickerSelectProps {
  value: string;
  onChange: (ticker: string) => void;
}

export function TickerSelect({ value, onChange }: TickerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = TICKERS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = TICKERS.find((t) => t.symbol === value);

  return (
    <div ref={ref} className="relative w-full">
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.98 }}
        className="flex w-full min-h-[52px] items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 sm:rounded-2xl sm:px-5 sm:py-4"
      >
          <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary sm:h-10 sm:w-10 sm:rounded-xl">
            {selected?.symbol.slice(0, 2) || "??"}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground sm:text-base">
              {selected?.symbol || "Select ticker"}
            </div>
            <div className="text-[11px] text-muted-foreground sm:text-xs">
              {selected?.name || "Choose a stock to simulate"}
            </div>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-muted-foreground" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-card/95 shadow-[0_16px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:rounded-2xl"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Search size={16} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tickers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.map((ticker, i) => (
                <motion.button
                  key={ticker.symbol}
                  type="button"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={() => {
                    onChange(ticker.symbol);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full min-h-[48px] items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.05] ${
                    value === ticker.symbol ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-muted-foreground">
                    {ticker.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {ticker.symbol}
                    </div>
                    <div className="text-[11px] text-muted-foreground sm:text-xs">{ticker.name}</div>
                  </div>
                  {value === ticker.symbol && (
                    <motion.div
                      layoutId="ticker-check"
                      className="ml-auto h-2 w-2 rounded-full bg-primary"
                    />
                  )}
                </motion.button>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No tickers found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
