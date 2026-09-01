"use client";

import React from "react";
import { bx } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "default" | "small";
  isLoading?: boolean;
}

// beginso-ui.css variant/size classes — see src/styles/beginso-ui.css §5 BUTTONS.
// "destructive" maps to the design system's "danger" variant (same role, different name
// on our side so existing call sites don't need to change).
const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-btn-primary",
  secondary: "bg-btn-secondary",
  destructive: "bg-btn-danger",
  ghost: "bg-btn-ghost",
};

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "",
  small: "bg-btn-sm",
};

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
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        onClick={handleClick}
        className={bx(
          "bg-btn",
          variantClass[variant],
          sizeClass[size],
          isLoading && "bg-btn-loading",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
