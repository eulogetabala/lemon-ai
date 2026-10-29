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
      {/* Icon mark — stark green square */}
      <div className="relative flex h-8 w-8 items-center justify-center shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lemon shadow-[0_4px_12px_rgba(27,77,40,0.2)]">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4.5 w-4.5"
            aria-hidden
          >
            <path d="M6 4H8V14H14V16H6V4Z" fill="#111410" />
            <circle cx="14" cy="6" r="2" fill="#111410" fillOpacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Name */}
      {!hideName && (
        <span className="text-base font-extrabold tracking-tighter text-ink">
          Lemon<span className="text-moss">.ai</span>
        </span>
      )}
    </div>
  );
}

export default Logo;