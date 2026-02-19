"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  className?: string;
  type?: "button" | "submit";
}

export function AnimatedButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
  type = "button",
}: AnimatedButtonProps) {
  const base =
    "relative inline-flex min-h-[44px] items-center justify-center gap-2 font-semibold transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden";

  const variants = {
    primary: `
      px-6 py-3 text-sm sm:px-8 sm:py-3.5
      bg-gradient-to-r from-primary to-accent text-white
      shadow-[0_4px_24px_rgba(99,102,241,0.3)]
      hover:shadow-[0_8px_40px_rgba(99,102,241,0.4)]
      disabled:opacity-40 disabled:cursor-not-allowed
    `,
    ghost: `
      px-4 py-2.5 text-sm sm:px-6 sm:py-3
      border border-white/10 text-muted-foreground
      hover:border-white/20 hover:text-foreground hover:bg-white/[0.03]
    `,
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {variant === "primary" && (
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
