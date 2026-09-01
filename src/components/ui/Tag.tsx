import React from "react";
import { X } from "lucide-react";
import { bx } from "@/lib/utils";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
  removeLabel?: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §8 BADGES, PILLS, TAGS.
export function Tag({ onRemove, removeLabel = "Remove", className, children, ...props }: TagProps) {
  return (
    <span className={bx("bg-tag", className)} {...props}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel}>
          <X size={12} />
        </button>
      )}
    </span>
  );
}
