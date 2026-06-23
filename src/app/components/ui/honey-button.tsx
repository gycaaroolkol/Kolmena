import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface HoneyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export const HoneyButton = ({ variant = "primary", children, className, ...props }: HoneyButtonProps) => {
  const isPrimary = variant === "primary";
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative w-full h-14 flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-lg",
        isPrimary 
          ? "bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 text-zinc-900" 
          : "bg-white text-zinc-800",
        className
      )}
      style={{ 
        clipPath: "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)"
      }}
      {...props}
    >
      {isPrimary && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
