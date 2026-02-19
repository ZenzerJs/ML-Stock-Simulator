"use client";

import { motion } from "framer-motion";

interface HorizonToggleProps {
  value: 6 | 12;
  onChange: (horizon: 6 | 12) => void;
}

const options = [
  { value: 6 as const, label: "6 Months" },
  { value: 12 as const, label: "12 Months" },
];

export function HorizonToggle({ value, onChange }: HorizonToggleProps) {
  return (
    <div className="relative flex w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 backdrop-blur-xl sm:rounded-2xl">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="relative z-10 flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 sm:rounded-xl sm:px-6"
          style={{
            color: value === opt.value ? "white" : "var(--color-muted-foreground)",
          }}
        >
          {opt.label}
        </button>
      ))}
      <motion.div
        layoutId="horizon-pill"
        className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-primary to-accent shadow-[0_4px_20px_rgba(99,102,241,0.3)]"
        style={{
          width: "calc(50% - 6px)",
          left: value === 6 ? "6px" : "calc(50% + 0px)",
        }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      />
    </div>
  );
}
