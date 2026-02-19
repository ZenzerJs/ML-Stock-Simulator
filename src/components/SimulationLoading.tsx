"use client";

import { motion } from "framer-motion";

const steps = [
  "Fetching 10 years of monthly data...",
  "Computing returns & building features...",
  "Training ARIMA, Ridge, Random Forest...",
  "Running walk-forward backtest...",
  "Generating bearish / stable / bullish scenarios...",
];

export function SimulationLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-10 sm:py-16"
    >
      {/* Animated orb */}
      <div className="relative mb-6 sm:mb-8">
        <motion.div
          className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary to-accent sm:h-20 sm:w-20"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-accent blur-xl"
          animate={{
            scale: [1.2, 1.5, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      </div>

      <motion.h3
        className="mb-4 text-base font-semibold text-foreground sm:mb-6 sm:text-lg"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Running Simulation
      </motion.h3>

      <div className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.8, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-primary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.8 + 0.2, type: "spring", stiffness: 500 }}
            />
            <span className="text-xs text-muted-foreground sm:text-sm">{step}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
