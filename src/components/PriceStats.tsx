"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

interface PriceStat {
  period: string;
  open: number;
  close: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
}

interface PriceStatsProps {
  stats: PriceStat[];
  horizon: number;
}

export function PriceStats({ stats, horizon }: PriceStatsProps) {
  const [expanded, setExpanded] = useState(false);
  const periodLabel = horizon <= 6 ? "Monthly" : "Monthly";
  const displayCount = expanded ? stats.length : Math.min(6, stats.length);
  const displayed = stats.slice(-displayCount).reverse();

  const avgChange =
    stats.reduce((s, p) => s + p.changePct, 0) / (stats.length || 1);
  const maxHigh = Math.max(...stats.map((s) => s.high));
  const minLow = Math.min(...stats.map((s) => s.low));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sm:rounded-3xl"
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9 sm:rounded-xl">
          <BarChart3 size={18} className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">{periodLabel} Price History</h3>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Recent {stats.length} periods — open, close, high, low, change
          </p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-px border-b border-white/[0.04] bg-white/[0.02]">
        <div className="bg-background px-3 py-2.5 text-center sm:px-4 sm:py-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            Avg Change
          </div>
          <div
            className={`mt-1 text-sm font-bold ${
              avgChange >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {avgChange >= 0 ? "+" : ""}
            {avgChange.toFixed(2)}%
          </div>
        </div>
        <div className="bg-background px-3 py-2.5 text-center sm:px-4 sm:py-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            Period High
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">
            ${maxHigh.toFixed(2)}
          </div>
        </div>
        <div className="bg-background px-3 py-2.5 text-center sm:px-4 sm:py-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            Period Low
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">
            ${minLow.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04] text-muted-foreground">
              <th className="px-4 py-3 text-left text-xs font-medium">Period</th>
              <th className="px-3 py-3 text-right text-xs font-medium">Open</th>
              <th className="px-3 py-3 text-right text-xs font-medium">Close</th>
              <th className="px-3 py-3 text-right text-xs font-medium">High</th>
              <th className="px-3 py-3 text-right text-xs font-medium">Low</th>
              <th className="px-4 py-3 text-right text-xs font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {displayed.map((stat, i) => {
                const isPositive = stat.change >= 0;
                return (
                  <motion.tr
                    key={stat.period}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {stat.period}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                      ${stat.open.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-foreground">
                      ${stat.close.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                      ${stat.high.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                      ${stat.low.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPositive ? (
                          <TrendingUp size={12} className="text-success" />
                        ) : (
                          <TrendingDown size={12} className="text-destructive" />
                        )}
                        <span
                          className={`font-mono text-xs font-semibold ${
                            isPositive ? "text-success" : "text-destructive"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {stat.changePct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {stats.length > 6 && (
        <motion.button
          type="button"
          onClick={() => setExpanded(!expanded)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 border-t border-white/[0.04] px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground sm:px-6"
        >
          {expanded ? "Show less" : `Show all ${stats.length} periods`}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>
      )}
    </motion.div>
  );
}
