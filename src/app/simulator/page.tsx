"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

import { TickerSelect } from "@/components/TickerSelect";
import { HorizonToggle } from "@/components/HorizonToggle";
import { AnimatedButton } from "@/components/AnimatedButton";
import { SimulationLoading } from "@/components/SimulationLoading";
import { SummaryCards } from "@/components/SummaryCards";
import { ModelPredictions } from "@/components/ModelPredictions";
import { MetricsTable } from "@/components/MetricsTable";
import { ScenarioChart } from "@/components/ScenarioChart";
import { BacktestChart } from "@/components/BacktestChart";
import { PriceStats } from "@/components/PriceStats";
import { ScenarioExplainer } from "@/components/ScenarioExplainer";
import { Disclaimer } from "@/components/Disclaimer";

import type { ModelScore } from "@/components/MetricsTable";

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
  chart: Array<{
    month: string;
    bearish: number;
    stable: number;
    bullish: number;
  }>;
}

interface PriceStat {
  period: string;
  open: number;
  close: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
}

interface BacktestPoint {
  month: string;
  actual: number;
  arima: number;
  ridge: number;
  rf: number;
}

interface HistoricalPrice {
  month: string;
  price: number;
}

interface SimulationResult {
  metadata: {
    ticker: string;
    currentPrice: number;
    dateRange: string;
    nPoints: number;
  };
  modelForecasts: ModelForecast[];
  modelScores: ModelScore[];
  backtestSeries: BacktestPoint[];
  historicalPrices: HistoricalPrice[];
  priceStats: PriceStat[];
}

type SimState = "idle" | "loading" | "done" | "error";

export default function SimulatorPage() {
  const [ticker, setTicker] = useState("");
  const [horizon, setHorizon] = useState<6 | 12>(6);
  const [state, setState] = useState<SimState>("idle");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSimulate() {
    if (!ticker) return;
    setState("loading");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, horizonMonths: horizon }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Simulation failed (${res.status})`);
      }

      const data: SimulationResult = await res.json();
      setResult(data);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 md:px-12"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Home
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-[0_2px_12px_rgba(99,102,241,0.3)]">
            <Activity size={15} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight">Simulator</span>
        </div>
      </motion.nav>

      <main className="flex-1 px-4 pb-6 sm:px-6 sm:pb-8 md:px-12">
        <div className="mx-auto max-w-5xl">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl sm:mb-8 sm:rounded-3xl sm:p-6 md:p-8"
          >
            <h1 className="mb-1 text-lg font-bold text-foreground sm:text-xl">
              Run Simulation
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Select a stock and horizon. Each ML model shows its own
              bearish / stable / bullish forecast.
            </p>

            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs sm:normal-case sm:tracking-normal">
                  Stock
                </label>
                <TickerSelect value={ticker} onChange={setTicker} />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs sm:normal-case sm:tracking-normal">
                  Forecast Horizon
                </label>
                <HorizonToggle value={horizon} onChange={setHorizon} />
              </div>
              <AnimatedButton
                onClick={handleSimulate}
                disabled={!ticker || state === "loading"}
                className="mt-2 w-full"
              >
                {state === "loading" ? (
                  <>
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    Running ML models...
                  </>
                ) : (
                  <>
                    <Activity size={16} />
                    Simulate
                  </>
                )}
              </AnimatedButton>
            </div>
          </motion.div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {state === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SimulationLoading />
              </motion.div>
            )}

            {state === "error" && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl border border-destructive/20 bg-destructive/[0.05] p-6 text-center"
              >
                <p className="mb-1 font-semibold text-destructive">
                  Simulation Failed
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <AnimatedButton
                  onClick={handleSimulate}
                  className="mt-4"
                  variant="ghost"
                >
                  Try Again
                </AnimatedButton>
              </motion.div>
            )}

            {state === "done" && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4 sm:gap-6"
              >
                <SummaryCards
                  ticker={ticker}
                  horizon={horizon}
                  dateRange={result.metadata.dateRange}
                  dataPoints={result.metadata.nPoints}
                  currentPrice={result.metadata.currentPrice}
                />

                <ModelPredictions
                  modelForecasts={result.modelForecasts}
                  selectedHorizon={horizon}
                  currentPrice={result.metadata.currentPrice}
                />

                <ScenarioChart
                  modelForecasts={result.modelForecasts}
                  historicalPrices={result.historicalPrices}
                  selectedHorizon={horizon}
                  currentPrice={result.metadata.currentPrice}
                  ticker={ticker}
                />

                <MetricsTable scores={result.modelScores} />

                <BacktestChart data={result.backtestSeries} />

                <PriceStats stats={result.priceStats} horizon={horizon} />

                <ScenarioExplainer />
                <Disclaimer compact />
              </motion.div>
            )}
          </AnimatePresence>

          {state === "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <motion.div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03]"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Activity size={24} className="text-muted-foreground" />
              </motion.div>
              <p className="text-sm text-muted-foreground">
                Select a stock and horizon above to get started.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Disclaimer />
    </div>
  );
}
