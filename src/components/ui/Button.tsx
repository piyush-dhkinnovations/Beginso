"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "../common/LoadingSpinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "default" | "small";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      disabled,
      isLoading,
      onClick,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all outline-none select-none disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]";

    const variants = {
      primary: "bg-slate-700 text-white hover:bg-slate-900",
      secondary:
        "bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-neutral-100",
      destructive:
        "bg-[#FEE2E2] border border-[#EF4444] text-[#B91C1C] hover:bg-[#EF4444] hover:text-white",
      ghost:
        "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border-none",
    };

    const sizes = {
      default: "h-[38px] px-4 text-[13px] rounded-[6px]",
      small: "h-[30px] px-3 text-[13px] rounded-[6px]",
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) {
        e.preventDefault();
        return;
      }
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        onClick={handleClick}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner variant="inline" className="text-current" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
