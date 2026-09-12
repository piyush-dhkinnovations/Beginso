import React from "react";
import { bx } from "@/lib/utils";

export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  content: string;
  children: React.ReactNode;
}

// beginso-ui.css §14 OVERLAYS ("Tooltip") — pure CSS via ::after + data-tip, triggers on
// :hover and :focus-within so a keyboard-focused child (e.g. a button) shows it too.
export function Tooltip({ content, children, className, ...props }: TooltipProps) {
  return (
    <span className={bx("bg-tooltip", className)} data-tip={content} {...props}>
      {children}
    </span>
  );
}
