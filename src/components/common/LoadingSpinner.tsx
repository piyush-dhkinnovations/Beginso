import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  variant?: "overlay" | "inline";
  className?: string;
}

export function LoadingSpinner({ variant = "inline", className }: LoadingSpinnerProps) {
  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-(--bg-page)/70 z-50">
        <div
          role="status"
          className={cn(
            "inline-flex animate-spin w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full",
            className
          )}
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "inline-flex animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full",
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
