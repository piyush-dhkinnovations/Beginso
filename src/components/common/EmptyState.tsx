import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, heading, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-12 max-w-md mx-auto",
        className
      )}
    >
      {icon && (
        <div className="text-neutral-400 mb-4 shrink-0 [&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </div>
      )}
      <h3 className="text-heading-2 text-neutral-800 mb-2">
        {heading}
      </h3>
      <p className="text-body text-neutral-500 mb-6 leading-relaxed">
        {body}
      </p>
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
