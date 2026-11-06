"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  name?: string;
  className?: string;
  hideName?: boolean;
  showSubtitle?: boolean;
  theme?: "dark" | "light" | "auto";
  size?: "sm" | "md" | "lg";
}

const Logo = ({
  name = "KORAPULSE",
  className,
  hideName = false,
  showSubtitle = false,
  theme = "auto",
  size = "md",
}: LogoProps) => {
  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const titleSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* KORAPULSE Emblem */}
      <div className={cn("relative flex items-center justify-center shrink-0", iconSizes[size])}>
        <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B4A] via-[#FF5722] to-[#E64A19] shadow-[0_4px_16px_rgba(255,87,34,0.35)] transition-transform hover:scale-105">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-[62%] w-[62%]"
            aria-hidden
          >
            {/* Elegant geometric K-pulse monogram */}
            <path
              d="M5 4.5C5 3.67 5.67 3 6.5 3H7.5C8.33 3 9 3.67 9 4.5V19.5C9 20.33 8.33 21 7.5 21H6.5C5.67 21 5 20.33 5 19.5V4.5Z"
              fill="white"
            />
            <path
              d="M10 13.2L16.2 4.9C16.7 4.2 17.7 4.1 18.4 4.6C19.1 5.1 19.2 6.1 18.7 6.8L13.6 13.5L19.2 20.1C19.7 20.8 19.5 21.8 18.8 22.3C18.1 22.8 17.1 22.6 16.6 21.9L10 14.1V13.2Z"
              fill="white"
            />
            {/* Subtle pulse dot accent */}
            <circle cx="17.5" cy="13.5" r="1.5" fill="white" fillOpacity="0.8" />
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      {!hideName && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-extrabold tracking-tight",
              titleSizes[size],
              theme === "dark"
                ? "text-white"
                : theme === "light"
                ? "text-slate-900"
                : "text-foreground"
            )}
          >
            {name}
          </span>
          {showSubtitle && (
            <span
              className={cn(
                "text-[9px] font-semibold tracking-[0.16em] uppercase mt-0.5",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )}
            >
              Social Media Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
