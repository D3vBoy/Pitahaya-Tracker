"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pitahaya-cerise/40 disabled:cursor-not-allowed disabled:opacity-50";
  
  const variants = {
    primary:
      "border-transparent bg-gradient-primary text-white shadow-glow-cerise hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(207,55,144,0.28)]",
    secondary:
      "border-pitahaya-border bg-pitahaya-surface text-pitahaya-gray-300 hover:border-pitahaya-cerise/50 hover:text-white",
    ghost:
      "border-transparent bg-transparent text-pitahaya-gray-300 hover:bg-pitahaya-cerise/10 hover:text-white",
    danger:
      "border-red-500/30 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:bg-red-500/20",
  };
  
  const sizes = {
    sm: "py-2 px-4 text-sm",
    md: "py-2.5 px-6 text-base",
    lg: "py-3 px-8 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </motion.button>
  );
}