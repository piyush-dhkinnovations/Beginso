"use client";

import React, { useState } from "react";
import { User } from "lucide-react";
import { bx } from "@/lib/utils";
import { initialsOf } from "@/lib/formatters";
import { localAvatarSrc } from "@/lib/avatarUrl";
import { avatarHue } from "@/lib/avatarTone";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  name?: string;
  alt?: string;
  size?: "xs" | "sm" | "default" | "lg" | "xl";
  square?: boolean;
  /** "auto" (default): initials get a colour of their own, chosen from the name. "plain": the one accent colour. */
  tone?: "auto" | "plain";
}

const sizeClass: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "bg-avatar-xs",
  sm: "bg-avatar-sm",
  default: "",
  lg: "bg-avatar-lg",
  xl: "bg-avatar-xl",
};


// beginso-ui.css classes — see src/styles/beginso-ui.css §9 AVATARS. Plain <img>, not
// next/image: .bg-avatar's fixed-size circle via a CSS custom property is simplest with a
// standard <img>, and avatars are never the page's LCP element.
export function Avatar({ src: rawSrc, name, alt, size = "default", square, tone = "auto", className, style, ...props }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = localAvatarSrc(rawSrc);
  const showImage = src && !failed;
  const initials = initialsOf(name);
  const hue = tone === "auto" && !showImage && initials ? avatarHue(name) : undefined;
  return (
    <span
      className={bx("bg-avatar", sizeClass[size], square && "bg-avatar-square", className)}
      data-tone={hue === undefined ? undefined : "auto"}
      style={hue === undefined ? style : ({ ...style, "--av-h": hue } as React.CSSProperties)}
      {...props}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? name ?? ""} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : initials ? (
        initials
      ) : (
        // Real bug found and fixed: an unknown name (e.g. a workspace form's owner — not yet
        // returned by GET /api/forms, per forms/page.tsx's own comment) rendered as a blank
        // colored circle with no visible content, reading as broken rather than "unknown."
        <User aria-hidden="true" style={{ width: "60%", height: "60%" }} />
      )}
    </span>
  );
}
