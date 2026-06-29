"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "ghost";
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
  const base = "font-medium rounded-lg transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-linear-to-r from-pitahaya-accent to-pitahaya-accent-light text-white hover:shadow-glow",
    secondary: "bg-pitahaya-accent/10 dark:bg-pitahaya-dark/60 border border-pitahaya-accent/20 hover:border-pitahaya-accent text-pitahaya-light-text dark:text-white",
    ghost: "bg-transparent hover:bg-pitahaya-accent/10 text-pitahaya-accent-light",
  };
  const sizes = {
    sm: "py-2 px-4 text-sm",
    md: "py-2.5 px-5 text-base",
    lg: "py-3 px-6 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </motion.button>
  );
}