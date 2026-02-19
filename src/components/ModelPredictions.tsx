"use client";

import { motion } from "framer-motion";
import { BrainCircuit, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScenarioData {
  bearish: number;
  stable: number;
  bullish: number;
  bearishPrice: number;
  stablePrice: number;
  bullishPrice: number;
}

interface ModelForecast {
  name: string;
  key: string;
  scenarios: Record<string, ScenarioData>;
  chart: Array<{ month: string; bearish: number; stable: number; bullish: number }>;
}

interface ModelPredictionsProps {
  modelForecasts: ModelForecast[];
  selectedHorizon: 6 | 12;
  currentPrice: number;
}

const MODEL_COLORS: Record<string, string> = {
  arima: "#06b6d4",
  ridge: "#f59e0b",
  rf: "#ec4899",
};

function ReturnBadge({ value }: { value: number }) {
  const isPos = value > 0.5;
  const isNeg = value < -0.5;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isPos
          ? "bg-success/10 text-success"
          : isNeg
          ? "bg-destructive/10 text-destructive"
          : "bg-white/5 text-muted-foreground"
      }`}
    >
      {isPos ? <TrendingUp size={10} /> : isNeg ? <TrendingDown size={10} /> : <Minus size={10} />}
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function ModelPredictions({
  modelForecasts,
  selectedHorizon,
  currentPrice,
}: ModelPredictionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sm:rounded-3xl"
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 sm:h-9 sm:w-9 sm:rounded-xl">
          <BrainCircuit size={18} className="text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            ML Model Scenarios
          </h3>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Each model&apos;s bearish / stable / bullish forecast at{" "}
            {selectedHorizon} months
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-white/[0.04] md:grid-cols-3 md:divide-x md:divide-y-0">
        {modelForecasts.map((mf, i) => {
          const scen = mf.scenarios[String(selectedHorizon)];
          if (!scen) return null;
          const color = MODEL_COLORS[mf.key] || "#6366f1";

          return (
            <motion.div
              key={mf.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="px-4 py-4 sm:px-5 sm:py-5"
            >
              {/* Model header */}
              <div className="mb-4 flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-sm font-semibold text-foreground">
                  {mf.name}
                </span>
              </div>

              {/* Scenario rows */}
              <div className="space-y-2.5">
                {(["bearish", "stable", "bullish"] as const).map((sKey) => {
                  const ret = scen[sKey];
                  const price =
                    scen[`${sKey}Price` as keyof ScenarioData] as number;
                  const scenColor =
                    sKey === "bearish"
                      ? "#ef4444"
                      : sKey === "bullish"
                      ? "#22c55e"
                      : "#6366f1";
                  return (
                    <div
                      key={sKey}
                      className="flex min-h-[40px] items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.015] px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: scenColor }}
                        />
                        <span className="text-[11px] capitalize text-muted-foreground sm:text-xs">
                          {sKey}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          ${price.toFixed(2)}
                        </span>
                        <ReturnBadge value={ret} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-center text-[11px] text-muted-foreground sm:text-xs">
                from ${currentPrice.toFixed(2)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
