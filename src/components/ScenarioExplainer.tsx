"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";

export function ScenarioExplainer({ arimaFallback }: { arimaFallback: boolean }) {
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
          using illustrative scenario spreads:
        </p>
        {arimaFallback && (
          <p>Some ARIMA fits fell back to a historical-mean estimate because all fit attempts failed.</p>
        )}
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="text-[#06b6d4]">ARIMA</strong> —
            compounds marginal monthly forecast bounds and the mean into scenario paths.
            These bounds do not establish coverage for the full horizon.
          </li>
          <li>
            <strong className="text-[#f59e0b]">Ridge Regression</strong> —
            point prediction +/- 1.28&times; the residual standard deviation
            from the walk-forward backtest when available and nonzero. Otherwise, a fallback spread uses the prediction magnitude with a minimum of 2 percentage points. Both are heuristics.
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
          dollar price using the latest completed monthly close. These spreads are not calibrated probabilities.
        </p>
      </div>
    </motion.div>
  );
}
