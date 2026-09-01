import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { bx } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children?: React.ReactNode;
}

const ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };
const VARIANT_CLASS = {
  info: "bg-alert-info",
  success: "bg-alert-success",
  warning: "bg-alert-warning",
  error: "bg-alert-error",
};

// beginso-ui.css classes — see src/styles/beginso-ui.css §13 FEEDBACK ("Alert / banner").
export function Alert({ variant = "info", title, children, className, ...props }: AlertProps) {
  const Icon = ICON[variant];
  return (
    <div className={bx("bg-alert", VARIANT_CLASS[variant], className)} role="alert" {...props}>
      <Icon className="bg-icon" />
      <div className="bg-alert-body">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}
