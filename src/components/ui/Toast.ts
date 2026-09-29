// Re-export, not a duplicate — the real implementation is src/components/common/Toast.tsx,
// already wired into the provider tree in src/app/layout.tsx (24 existing call sites depend on
// that path). This file exists so new V2 code can still import from `components/ui/`, per
// CLAUDE.md's "a screen imports from components/ui/, never a raw class name" rule, without a
// second Toast implementation (requirements.md 2.2 explicitly rules that out).
export { ToastProvider, useToast } from "@/components/common/Toast";
export type { ToastMessage, ToastAction } from "@/components/common/Toast";
