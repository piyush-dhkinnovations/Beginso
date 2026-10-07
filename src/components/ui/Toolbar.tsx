import React from "react";
import { bx } from "@/lib/utils";

// One row grouping search + filters + view switcher above a list or table.
export function Toolbar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={bx("flex flex-wrap items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}
