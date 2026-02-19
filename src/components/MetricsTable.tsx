"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";

export interface ModelScore {
  modelName: string;
  mae: number;
  rmse: number;
}

interface MetricsTableProps {
  scores: ModelScore[];
}

export function MetricsTable({ scores }: MetricsTableProps) {
  const sorted = [...scores].sort((a, b) => a.mae - b.mae);
  const bestModel = sorted[0]?.modelName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sm:rounded-3xl"
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9 sm:rounded-xl">
          <TrendingUp size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">Backtest Accuracy</h3>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Walk-forward evaluation on return % predictions (lower is better)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04] text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium sm:px-6">Model</th>
              <th className="px-4 py-3 text-right font-medium sm:px-6">MAE (%)</th>
              <th className="px-4 py-3 text-right font-medium sm:px-6">RMSE (%)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((score, i) => (
              <motion.tr
                key={score.modelName}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="group border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3.5 sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2">
                    {score.modelName === bestModel && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                          delay: 0.5,
                        }}
                      >
                        <Trophy size={14} className="text-warning" />
                      </motion.div>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {score.modelName}
                    </span>
                    {score.modelName === bestModel && (
                      <span className="hidden rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning sm:inline-flex">
                        BEST
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-sm text-muted-foreground sm:px-6 sm:py-4">
                  {score.mae.toFixed(2)}%
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-sm text-muted-foreground sm:px-6 sm:py-4">
                  {score.rmse.toFixed(2)}%
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
