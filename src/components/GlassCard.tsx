"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  glow?: boolean;
  hoverLift?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className = "", glow = false, hoverLift = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverLift ? { y: -4, scale: 1.01 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`
          rounded-3xl border border-white/[0.06] 
          bg-white/[0.03] backdrop-blur-xl
          shadow-[0_8px_32px_rgba(0,0,0,0.3)]
          ${glow ? "glow-sm" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";
