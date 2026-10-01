import React from "react";
import { bx } from "@/lib/utils";
import { ILLUSTRATIONS, type IllustrationName } from "./illustrations.generated";

export type { IllustrationName };

export interface IllustrationProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: IllustrationName;
  size?: "sm" | "default";
}

// unDraw spot illustration, inlined with its colours rewritten to V2 tokens (see
// scripts/build-illustrations.mjs), so it follows light/midnight/dimmed. Always decorative —
// the heading beside it carries the meaning, so it is aria-hidden. Returns null when the
// slot has no artwork yet, letting callers fall back to their icon.
export function Illustration({ name, size = "default", className, ...props }: IllustrationProps) {
  const svg = ILLUSTRATIONS[name];
  if (!svg) return null;
  return (
    <span
      aria-hidden="true"
      className={bx("bg-illustration", size === "sm" && "bg-illustration-sm", className)}
      // Static, build-time SVG from our own repo — never user input.
      dangerouslySetInnerHTML={{ __html: svg }}
      {...props}
    />
  );
}

export function hasIllustration(name: IllustrationName): boolean {
  return !!ILLUSTRATIONS[name];
}

/** The illustration when its artwork exists, otherwise `fallback` (usually the state's icon). */
export function StateArt({ name, size, className, fallback }: IllustrationProps & { fallback?: React.ReactNode }) {
  return hasIllustration(name) ? <Illustration name={name} size={size} className={className} /> : <>{fallback}</>;
}
