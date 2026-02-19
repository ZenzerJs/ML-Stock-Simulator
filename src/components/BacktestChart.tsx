"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface BacktestPoint {
  month: string;
  actual: number;
  arima: number;
  ridge: number;
  rf: number;
}

interface BacktestChartProps {
  data: BacktestPoint[];
}

const LINES = [
  { key: "actual" as const, label: "Actual Price", color: "#a1a1aa", dash: undefined },
  { key: "arima" as const, label: "ARIMA", color: "#06b6d4", dash: "6 3" },
  { key: "ridge" as const, label: "Ridge", color: "#f59e0b", dash: "6 3" },
  { key: "rf" as const, label: "Random Forest", color: "#ec4899", dash: "6 3" },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full" style={{ background: e.color }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-mono font-medium text-foreground">
            ${e.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

type LineKey = "actual" | "arima" | "ridge" | "rf";

export function BacktestChart({ data }: BacktestChartProps) {
  const [visible, setVisible] = useState<Set<LineKey>>(
    new Set(["actual", "arima", "ridge", "rf"])
  );

  function toggle(key: LineKey) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sm:rounded-3xl"
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 sm:h-9 sm:w-9 sm:rounded-xl">
          <BarChart3 size={18} className="text-success" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">Backtest Results</h3>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Walk-forward: actual vs each model&apos;s predicted price
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3 sm:px-6 sm:pt-4">
        {LINES.map((l) => {
          const on = visible.has(l.key);
          return (
            <motion.button
              key={l.key}
              type="button"
              onClick={() => toggle(l.key)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:text-[11px]"
              style={{
                background: on ? `${l.color}18` : "rgba(255,255,255,0.02)",
                border: `1px solid ${on ? `${l.color}50` : "rgba(255,255,255,0.06)"}`,
                color: on ? l.color : "#71717a",
              }}
            >
              <AnimatePresence>
                {on && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: l.color }}
                  />
                )}
              </AnimatePresence>
              {l.label}
            </motion.button>
          );
        })}
      </div>

      <div className="px-2 py-4 sm:px-4 sm:py-6">
        <ResponsiveContainer width="100%" height={260} className="sm:!h-[320px]">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            {LINES.map((l) =>
              visible.has(l.key) ? (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.label}
                  stroke={l.color}
                  strokeWidth={l.key === "actual" ? 2 : 2}
                  strokeDasharray={l.dash}
                  dot={{ r: 3, fill: l.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: l.color }}
                  animationDuration={500}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
