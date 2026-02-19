"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface ChartPoint {
  month: string;
  bearish: number;
  stable: number;
  bullish: number;
}

interface ModelForecast {
  name: string;
  key: string;
  scenarios: Record<
    string,
    {
      bearish: number;
      stable: number;
      bullish: number;
      bearishPrice: number;
      stablePrice: number;
      bullishPrice: number;
    }
  >;
  chart: ChartPoint[];
}

interface HistoricalPoint {
  month: string;
  price: number;
}

interface ScenarioChartProps {
  modelForecasts: ModelForecast[];
  historicalPrices: HistoricalPoint[];
  selectedHorizon: 6 | 12;
  currentPrice: number;
  ticker: string;
}

type ScenarioKey = "bearish" | "stable" | "bullish";

const MODEL_COLORS: Record<string, string> = {
  arima: "#06b6d4",
  ridge: "#f59e0b",
  rf: "#ec4899",
};

const SCENARIOS: Array<{
  key: ScenarioKey;
  label: string;
  color: string;
}> = [
  { key: "bearish", label: "Bearish", color: "#ef4444" },
  { key: "stable", label: "Stable", color: "#6366f1" },
  { key: "bullish", label: "Bullish", color: "#22c55e" },
];

interface UnifiedPoint {
  month: string;
  price?: number;
  bearish?: number;
  stable?: number;
  bullish?: number;
  isNow?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | undefined;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}) {
  if (!active || !payload) return null;

  const seen = new Set<string>();
  const items: typeof payload = [];
  for (let i = payload.length - 1; i >= 0; i--) {
    const p = payload[i];
    if (p.value == null || seen.has(p.dataKey)) continue;
    seen.add(p.dataKey);
    items.unshift(p);
  }
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#111114]/95 px-3.5 py-2.5 shadow-[0_12px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </p>
      {items.map((e) => (
        <div key={e.dataKey} className="flex items-center gap-2 py-0.5">
          <div
            className="h-[3px] w-3 rounded-full"
            style={{ background: e.color }}
          />
          <span className="text-[11px] text-muted-foreground">{e.name}</span>
          <span className="ml-auto font-mono text-xs font-semibold text-foreground">
            ${e.value?.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ScenarioChart({
  modelForecasts,
  historicalPrices,
  selectedHorizon,
  currentPrice,
  ticker,
}: ScenarioChartProps) {
  const [activeModel, setActiveModel] = useState(0);
  const [visibleScenarios, setVisibleScenarios] = useState<Set<ScenarioKey>>(
    new Set(["bearish", "stable", "bullish"])
  );

  const model = modelForecasts[activeModel];
  const scen = model?.scenarios[String(selectedHorizon)];
  const accentColor = MODEL_COLORS[model?.key ?? "arima"];

  const { data, nowIndex } = useMemo(() => {
    if (!model) return { data: [], nowIndex: 0 };

    const unified: UnifiedPoint[] = [];

    for (const hp of historicalPrices) {
      unified.push({ month: hp.month, price: hp.price });
    }

    const lastHist = unified[unified.length - 1];
    if (lastHist) {
      lastHist.isNow = true;
      lastHist.bearish = lastHist.price;
      lastHist.stable = lastHist.price;
      lastHist.bullish = lastHist.price;
    }

    const ni = unified.length - 1;

    for (const fp of model.chart) {
      if (fp.month === "Now") continue;
      unified.push({
        month: fp.month,
        bearish: fp.bearish,
        stable: fp.stable,
        bullish: fp.bullish,
      });
    }

    return { data: unified, nowIndex: ni };
  }, [model, historicalPrices]);

  function toggleScenario(key: ScenarioKey) {
    setVisibleScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!model) return null;

  const nowLabel = data[nowIndex]?.month ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0d] backdrop-blur-xl sm:rounded-3xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl"
            style={{ background: `${accentColor}15` }}
          >
            <TrendingUp size={18} style={{ color: accentColor }} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-bold text-foreground sm:text-lg">{ticker}</h3>
              <span className="font-mono text-xs text-muted-foreground sm:text-sm">
                ${currentPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              {model.name} — {selectedHorizon}m forecast
            </p>
          </div>
        </div>
      </div>

      {/* Model tabs */}
      <div className="flex border-b border-white/[0.04] border-t border-t-white/[0.04]">
        {modelForecasts.map((mf, i) => {
          const isActive = i === activeModel;
          const color = MODEL_COLORS[mf.key] || "#6366f1";
          return (
            <motion.button
              key={mf.key}
              type="button"
              onClick={() => setActiveModel(i)}
              whileTap={{ scale: 0.97 }}
              className="relative flex-1 px-3 py-3 text-center text-xs font-medium transition-colors sm:px-4 sm:text-[13px]"
              style={{
                color: isActive ? color : "#52525b",
                background: isActive ? `${color}06` : "transparent",
              }}
            >
              {mf.name}
              {isActive && (
                <motion.div
                  layoutId="model-tab-line"
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: color }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Scenario toggles */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 sm:gap-2 sm:px-6 sm:py-3">
        {SCENARIOS.map((s) => {
          const on = visibleScenarios.has(s.key);
          return (
            <motion.button
              key={s.key}
              type="button"
              onClick={() => toggleScenario(s.key)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:text-[11px]"
              style={{
                background: on
                  ? `${s.color}15`
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  on ? `${s.color}40` : "rgba(255,255,255,0.05)"
                }`,
                color: on ? s.color : "#52525b",
              }}
            >
              <AnimatePresence>
                {on && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: s.color }}
                  />
                )}
              </AnimatePresence>
              {s.label}
            </motion.button>
          );
        })}
      </div>

      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={model.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="px-2 pb-4"
        >
          <ResponsiveContainer width="100%" height={320} className="sm:!h-[420px]">
            <ComposedChart
              data={data}
              margin={{ top: 16, right: 12, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bearFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stabFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bullFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                horizontal
                vertical={false}
                stroke="rgba(255,255,255,0.03)"
              />

              <XAxis
                dataKey="month"
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                orientation="right"
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                domain={["auto", "auto"]}
                width={60}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "rgba(255,255,255,0.1)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />

              {/* "Now" reference line */}
              <ReferenceLine
                x={nowLabel}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="3 6"
                label={{
                  value: "Now",
                  position: "insideTopRight",
                  fill: "#52525b",
                  fontSize: 10,
                }}
              />

              {/* Historical price area + line */}
              <Area
                type="monotone"
                dataKey="price"
                name="Price"
                stroke="none"
                fill="url(#histGrad)"
                connectNulls={false}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="price"
                name="Price"
                stroke="#d4d4d8"
                strokeWidth={1.8}
                dot={false}
                connectNulls={false}
                animationDuration={800}
              />

              {/* Forecast scenario areas */}
              {visibleScenarios.has("bullish") && (
                <Area
                  type="monotone"
                  dataKey="bullish"
                  name="Bullish"
                  stroke="none"
                  fill="url(#bullFill)"
                  connectNulls={false}
                  animationDuration={600}
                />
              )}
              {visibleScenarios.has("stable") && (
                <Area
                  type="monotone"
                  dataKey="stable"
                  name="Stable"
                  stroke="none"
                  fill="url(#stabFill)"
                  connectNulls={false}
                  animationDuration={600}
                />
              )}
              {visibleScenarios.has("bearish") && (
                <Area
                  type="monotone"
                  dataKey="bearish"
                  name="Bearish"
                  stroke="none"
                  fill="url(#bearFill)"
                  connectNulls={false}
                  animationDuration={600}
                />
              )}

              {/* Forecast scenario lines */}
              {visibleScenarios.has("bullish") && (
                <Line
                  type="monotone"
                  dataKey="bullish"
                  name="Bullish"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls={false}
                  animationDuration={600}
                />
              )}
              {visibleScenarios.has("stable") && (
                <Line
                  type="monotone"
                  dataKey="stable"
                  name="Stable"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                  animationDuration={600}
                />
              )}
              {visibleScenarios.has("bearish") && (
                <Line
                  type="monotone"
                  dataKey="bearish"
                  name="Bearish"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls={false}
                  animationDuration={600}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>

      {/* Footer: scenario endpoint prices */}
      {scen && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
            <div className="h-[3px] w-4 rounded-full bg-[#d4d4d8]" />
            <span>Historical</span>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-5">
            {SCENARIOS.filter((s) => visibleScenarios.has(s.key)).map((s) => {
              const price = scen[
                `${s.key}Price` as keyof typeof scen
              ] as number;
              const ret = scen[s.key as keyof typeof scen] as number;
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs"
                >
                  <div
                    className="h-[3px] w-3 rounded-full"
                    style={{
                      background: s.color,
                    }}
                  />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono font-semibold text-foreground">
                    ${price.toFixed(2)}
                  </span>
                  <span
                    className={`font-mono text-[10px] ${
                      ret >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {ret >= 0 ? "+" : ""}
                    {ret.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
