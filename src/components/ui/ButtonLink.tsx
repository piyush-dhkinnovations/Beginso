import React from "react";
import Link from "next/link";
import { bx } from "@/lib/utils";

export interface ButtonLinkProps extends Omit<React.ComponentProps<typeof Link>, "className"> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "default" | "small";
  className?: string;
}

// Same look as Button (beginso-ui.css §5 BUTTONS), rendered as a navigation link so it gets
// prefetching, middle-click and the correct "link" semantics. Use it instead of writing
// `<Link className="bg-btn bg-btn-primary">` in a screen.
const variantClass = {
  primary: "bg-btn-primary",
  secondary: "bg-btn-secondary",
  destructive: "bg-btn-danger",
  ghost: "bg-btn-ghost",
} as const;

export function ButtonLink({ variant = "primary", size = "default", className, ...props }: ButtonLinkProps) {
  return <Link className={bx("bg-btn", variantClass[variant], size === "small" && "bg-btn-sm", className)} {...props} />;
}
