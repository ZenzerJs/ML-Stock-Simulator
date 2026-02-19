"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, DollarSign, Hash } from "lucide-react";

interface SummaryCardsProps {
  ticker: string;
  horizon: number;
  dateRange: string;
  dataPoints: number;
  currentPrice: number;
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

export function SummaryCards({
  ticker,
  horizon,
  dateRange,
  dataPoints,
  currentPrice,
}: SummaryCardsProps) {
  const items = [
    { icon: <DollarSign size={16} />, label: ticker, value: `$${currentPrice.toFixed(2)}` },
    { icon: <Clock size={16} />, label: "Horizon", value: `${horizon} months` },
    { icon: <Calendar size={16} />, label: "Date Range", value: dateRange },
    { icon: <Hash size={16} />, label: "Data Points", value: String(dataPoints) },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.08 }}
      className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={cardVariants}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 backdrop-blur-xl sm:rounded-2xl sm:px-4 sm:py-3.5"
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground sm:mb-2 sm:gap-2">
            {item.icon}
            <span className="text-[11px] font-medium sm:text-xs">{item.label}</span>
          </div>
          <div className="text-base font-bold text-foreground sm:text-lg">{item.value}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
