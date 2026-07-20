import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-neutral-200 rounded-lg shadow-card p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
