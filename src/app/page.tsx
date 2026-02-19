"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AnimatedButton } from "@/components/AnimatedButton";
import { Disclaimer } from "@/components/Disclaimer";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ChevronRight,
  LineChart,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: <BarChart3 size={22} />,
    title: "Baseline Model Comparison",
    desc: "Compare ARIMA, Ridge, and Random Forest on 10 years of monthly data.",
  },
  {
    icon: <LineChart size={22} />,
    title: "Scenario Forecasting",
    desc: "View bearish, stable, and bullish projections for 6-month or 12-month horizons.",
  },
  {
    icon: <BrainCircuit size={22} />,
    title: "Walk-Forward Evaluation",
    desc: "Time-respecting backtest with MAE and RMSE metrics for each model.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const BUBBLE_COLORS = [
  { bg: "rgba(99,102,241,0.15)", glow: "rgba(99,102,241,0.3)" },
  { bg: "rgba(129,140,248,0.12)", glow: "rgba(129,140,248,0.25)" },
  { bg: "rgba(34,197,94,0.10)", glow: "rgba(34,197,94,0.2)" },
  { bg: "rgba(168,85,247,0.10)", glow: "rgba(168,85,247,0.2)" },
  { bg: "rgba(99,102,241,0.08)", glow: "rgba(99,102,241,0.15)" },
  { bg: "rgba(56,189,248,0.10)", glow: "rgba(56,189,248,0.2)" },
];

function hash(seed: number): number {
  let h = (seed * 2654435761) >>> 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b >>> 0;
  h = ((h >>> 16) ^ h) >>> 0;
  return (h % 10000) / 10000;
}

const BUBBLES = Array.from({ length: 28 }, (_, i) => {
  const r = (s: number) => hash(i * 97 + s * 31);
  const colorSet = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
  const size = Math.round(3 + r(1) * 6);
  return {
    id: i,
    left: `${Math.round(5 + r(2) * 90)}%`,
    size: `${size}px`,
    duration: `${Math.round(12 + r(3) * 18)}s`,
    delay: `${Math.round(r(4) * -25)}s`,
    drift: `${Math.round(4 + r(5) * 6)}s`,
    bg: colorSet.bg,
    glow: colorSet.glow,
  };
});

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* ── Fizzy bubble layer ─────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {BUBBLES.map((b) => (
          <div
            key={b.id}
            className="bubble-wrap"
            style={
              {
                left: b.left,
                "--drift": b.drift,
              } as React.CSSProperties
            }
          >
            <div
              className="bubble-dot bubble-dot-glow"
              style={
                {
                  width: b.size,
                  height: b.size,
                  background: b.bg,
                  "--glow-color": b.glow,
                  "--duration": b.duration,
                  "--delay": b.delay,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 md:px-12"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_2px_12px_rgba(99,102,241,0.3)]">
            <Activity size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            ML<span className="text-primary">Sim</span>
          </span>
        </div>
        <Link href="/simulator">
          <AnimatedButton variant="ghost">
            Open Simulator <ChevronRight size={14} />
          </AnimatedButton>
        </Link>
      </motion.nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-6 sm:px-6 sm:pb-12 md:pt-0">
        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" as const }}
          className="mb-6 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" as const }}
          >
            <Sparkles size={14} className="text-primary" />
          </motion.div>
          <span className="text-xs font-medium text-muted-foreground">
            Educational ML Simulation
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-4 max-w-3xl text-center text-3xl font-extrabold leading-tight tracking-tight sm:mb-5 sm:text-4xl md:text-5xl lg:text-6xl"
        >
          Forecast stock returns with{" "}
          <motion.span
            className="gradient-text"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundSize: "200% 200%",
              background:
                "linear-gradient(135deg, #6366f1 0%, #818cf8 25%, #a5b4fc 50%, #818cf8 75%, #6366f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            baseline ML models
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mb-8 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:mb-10 sm:text-base md:text-lg"
        >
          Compare simple forecasting models on 10 years of data. Explore
          bearish, stable, and bullish scenarios for any ticker — no financial
          advice, just clean analysis.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex gap-4"
        >
          <Link href="/simulator">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <AnimatedButton>
                <Activity size={16} />
                Launch Simulator
              </AnimatedButton>
            </motion.div>
          </Link>
        </motion.div>

        {/* ── Feature cards ────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:mt-20 sm:gap-5 md:mt-24 md:grid-cols-3"
        >
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl transition-colors duration-300 hover:border-primary/20 hover:bg-white/[0.04] sm:rounded-3xl sm:p-6"
            >
              {/* Card shimmer on hover */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              <motion.div
                className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {feat.icon}
              </motion.div>
              <h3 className="relative mb-2 font-semibold text-foreground">
                {feat.title}
              </h3>
              <p className="relative text-sm leading-relaxed text-muted-foreground">
                {feat.desc}
              </p>

              {/* Subtle corner accent */}
              <div
                className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: [
                    "rgba(99,102,241,0.12)",
                    "rgba(34,197,94,0.10)",
                    "rgba(168,85,247,0.10)",
                  ][i],
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </main>

      <Disclaimer />
    </div>
  );
}
