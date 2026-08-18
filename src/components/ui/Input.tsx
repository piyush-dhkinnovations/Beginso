import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightSlot?: React.ReactNode;
  id: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, disabled, type = "text", id, rightSlot, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={id}
            className="text-heading-3 text-neutral-800"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "w-full rounded-md px-3 text-[13px] h-[38px] min-h-[44px] bg-white transition-colors duration-200 outline-none",
              "border-2 border-neutral-200",
              "focus:border-neutral-500",
              error && "border-error focus:border-error",
              disabled && "bg-neutral-100 opacity-60 cursor-not-allowed pointer-events-none",
              rightSlot && "pr-12",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center min-w-[44px] min-h-[44px]">
              {rightSlot}
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-caption text-error font-semibold flex items-center gap-1 mt-0.5"
          >
            <AlertCircle size={10} className="shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
