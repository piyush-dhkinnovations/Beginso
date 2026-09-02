import React from "react";
import { bx } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padded?: boolean;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §10 CARDS. Every existing call site
// already supplies its own padding/gap/layout via className (p-8, flex flex-col gap-6, ...) — now
// that beginso-ui.css is layered below Tailwind's utilities (design.md §6), those overrides keep
// winning normally, so applying .bg-card-pad's sensible default here doesn't change any of them.
export function Card({ className, children, padded = true, ...props }: CardProps) {
  return (
    <div className={bx("bg-card", padded && "bg-card-pad", className)} {...props}>
      {children}
    </div>
  );
}
