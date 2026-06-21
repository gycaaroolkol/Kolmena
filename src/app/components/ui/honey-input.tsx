import React from "react";
import { Mail, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoneyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const HoneyInput = React.forwardRef<HTMLInputElement, HoneyInputProps>(
  ({ className, icon, rightElement, ...props }, ref) => {
    return (
      <div className="relative group w-full">
        <div 
          className="absolute inset-0 bg-amber-500/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
          style={{ clipPath: "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)" }}
        />
        <div
          className="relative flex items-center bg-zinc-900/80 border-2 border-amber-500/30 text-white transition-all duration-300 focus-within:border-amber-400 focus-within:shadow-[0_0_0_3px_rgba(251,191,36,0.15),0_8px_24px_rgba(251,191,36,0.2)] hover:border-amber-500/40"
          style={{ 
            clipPath: "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)",
            minHeight: "56px"
          }}
        >
          {icon && <div className="pl-5 text-amber-500 transition-all duration-300 group-focus-within:text-amber-400 group-focus-within:scale-110">{icon}</div>}
          <input
            ref={ref}
            className={cn(
              "flex-1 bg-transparent border-none outline-none px-4 py-3 text-lg placeholder:text-zinc-500 w-full",
              className
            )}
            {...props}
          />
          {rightElement && <div className="pr-5">{rightElement}</div>}
        </div>
      </div>
    );
  }
);

HoneyInput.displayName = "HoneyInput";