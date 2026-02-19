"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-start gap-2.5 rounded-xl border border-warning/10 bg-warning/[0.03] px-4 py-3 sm:rounded-2xl"
      >
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
        <p className="text-[11px] leading-relaxed text-warning/70 sm:text-xs">
          This is an educational simulation tool, not financial advice. Past
          performance does not predict future results. Do not use for investment
          decisions.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="border-t border-white/[0.04] px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="mx-auto flex max-w-4xl items-start gap-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning/60" />
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          <strong className="text-warning/70">Disclaimer:</strong> ML Stock
          Simulator is an educational tool. All forecasts are based on historical
          data using simple baseline models. This is not financial advice,
          investment guidance, or a trading recommendation. Past performance does
          not guarantee future results.
        </p>
      </div>
    </motion.footer>
  );
}
