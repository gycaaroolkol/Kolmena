import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface TechButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  children: React.ReactNode;
}

export const TechButton = ({ variant = "primary", children, className, ...props }: TechButtonProps) => {
  const variants = {
    primary: "bg-[#FFA500] text-black hover:bg-[#FF9500] shadow-lg shadow-[#FFA500]/20 font-bold",
    outline: "bg-transparent border-2 border-zinc-300 text-zinc-700 hover:border-[#FFA500] hover:text-black hover:bg-[#FFA500]/5",
    ghost: "bg-transparent text-zinc-600 hover:text-[#FFA500]",
  };
  
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full flex items-center justify-center transition-all duration-200 rounded-lg",
        variants[variant],
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};