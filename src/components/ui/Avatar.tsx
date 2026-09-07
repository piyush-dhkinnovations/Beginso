"use client";

import React, { useState } from "react";
import { bx } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  name?: string;
  alt?: string;
  size?: "xs" | "sm" | "default" | "lg" | "xl";
  square?: boolean;
}

const sizeClass: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "bg-avatar-xs",
  sm: "bg-avatar-sm",
  default: "",
  lg: "bg-avatar-lg",
  xl: "bg-avatar-xl",
};

function initialsFrom(name?: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §9 AVATARS. Plain <img>, not
// next/image: .bg-avatar's fixed-size circle via a CSS custom property is simplest with a
// standard <img>, and avatars are never the page's LCP element.
export function Avatar({ src, name, alt, size = "default", square, className, ...props }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span className={bx("bg-avatar", sizeClass[size], square && "bg-avatar-square", className)} {...props}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? name ?? ""} onError={() => setFailed(true)} />
      ) : (
        initialsFrom(name)
      )}
    </span>
  );
}
