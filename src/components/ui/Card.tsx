import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-neutral-200 rounded-lg shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_#E2E8F0] p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
