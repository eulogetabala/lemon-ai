"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  name?: string;
  className?: string;
  hideName?: boolean;
}

const Logo = ({ name = "Lemon.ai", className, hideName = false }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon mark */}
      <div className="relative flex h-7 w-7 items-center justify-center shrink-0">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm" />
        {/* Main icon container */}
        <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#84cc16] shadow-[0_0_12px_rgba(163,230,53,0.4)]">
          {/* Lemon emoji-style icon using SVG */}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
          >
            <path
              d="M8 2C5.5 2 3 4 3 7.5C3 11 5.5 14 8 14C10.5 14 13 11 13 7.5C13 4 10.5 2 8 2Z"
              fill="#0f172a"
              fillOpacity="0.85"
            />
            <path
              d="M8 4C6.5 4 5 5.5 5 7.5C5 9.5 6.5 12 8 12C9.5 12 11 9.5 11 7.5C11 5.5 9.5 4 8 4Z"
              fill="#0f172a"
              fillOpacity="0.4"
            />
            <circle cx="8" cy="7.5" r="1.5" fill="#0f172a" fillOpacity="0.6" />
            <path
              d="M8 2L9 0.5"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Name */}
      {!hideName && (
        <span className="text-base font-bold tracking-tight">
          <span className="text-foreground">Lemon</span>
          <span className="text-gradient-lime-simple">.ai</span>
        </span>
      )}
    </div>
  );
}

export default Logo;