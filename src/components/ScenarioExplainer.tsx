"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";

export function ScenarioExplainer() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="rounded-xl border border-primary/10 bg-primary/[0.03] px-4 py-3.5 sm:rounded-2xl sm:px-5 sm:py-4"
    >
      <div className="mb-2 flex items-center gap-2 sm:mb-2.5">
        <Info size={14} className="text-primary" />
        <span className="text-[11px] font-semibold text-primary sm:text-xs">
          How each model generates its scenarios
        </span>
      </div>
      <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
        <p>
          Each model produces its own{" "}
          <strong className="text-destructive">bearish</strong> /{" "}
          <strong className="text-primary">stable</strong> /{" "}
          <strong className="text-success">bullish</strong> price forecast
          using its native uncertainty estimation:
        </p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="text-[#06b6d4]">ARIMA</strong> —
            forecasts monthly returns with 80% confidence intervals.
            Lower bound compounds to bearish, mean to stable, upper to bullish.
          </li>
          <li>
            <strong className="text-[#f59e0b]">Ridge Regression</strong> —
            point prediction +/- 1.28&times; the residual standard deviation
            from the walk-forward backtest (roughly 80% coverage).
          </li>
          <li>
            <strong className="text-[#ec4899]">Random Forest</strong> —
            200 individual trees each vote on a prediction. Bearish = 10th
            percentile, stable = 50th (median), bullish = 90th percentile
            of tree outputs.
          </li>
        </ul>
        <p>
          Select a model tab on the chart to see that model&apos;s view of
          the market. Each scenario is converted from predicted return % to
          dollar price using the current stock price.
        </p>
      </div>
    </motion.div>
  );
}
