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
        "flex flex-col items-center justify-center text-center p-12",
        className
      )}
    >
      {icon && (
        <div className="text-text-muted mb-4 shrink-0 [&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </div>
      )}
      <h3 className="text-heading-2 text-text-primary mb-2">
        {heading}
      </h3>
      <p className="text-body text-text-muted mb-6 leading-relaxed max-w-[42ch] mx-auto">
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
