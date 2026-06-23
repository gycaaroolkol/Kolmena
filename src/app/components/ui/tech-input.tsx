import React from "react";
import { cn } from "@/lib/utils";

interface TechInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  rightElement?: React.ReactNode;
}

export const TechInput = React.forwardRef<HTMLInputElement, TechInputProps>(
  ({ className, icon, label, rightElement, ...props }, ref) => {
    return (
      <div className="w-full space-y-2 group">
        {label && (
          <label className="text-sm text-zinc-700 font-medium group-focus-within:text-[#FFA500] transition-colors">
            {label}
          </label>
        )}
        <div className="relative">
          <div
            className={cn(
              "flex items-center bg-zinc-100 border-2 border-zinc-300 text-black transition-all duration-300",
              "focus-within:border-[#FFA500] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,165,0,0.1),0_8px_24px_rgba(255,165,0,0.15)]",
              "hover:bg-white hover:border-zinc-400 hover:shadow-sm",
              "rounded-lg"
            )}
          >
            {icon && (
              <div className="pl-4 text-zinc-500 group-focus-within:text-[#FFA500] transition-colors">
                {icon}
              </div>
            )}
            <input
              ref={ref}
              className={cn(
                "flex-1 bg-transparent border-none outline-none px-4 py-3.5 text-base placeholder:text-zinc-400 w-full",
                className
              )}
              {...props}
            />
            {rightElement && (
              <div className="pr-2">
                {rightElement}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TechInput.displayName = "TechInput";
