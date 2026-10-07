import { Card, type CardProps } from '@/components/ui/Card';
import { Wordmark } from '@/components/landing/Wordmark';

// Every (auth) page's outer Card, with the Beginso wordmark inside it (top-center) rather than
// floating above it. No `force` prop on Wordmark here — the card itself is theme-aware
// (bg-card switches under [data-theme="dark"]), so the wordmark auto-swaps to name-dark.svg via
// the same [data-theme] toggle instead of being pinned to one color.
export function AuthCard({ children, className, ...props }: CardProps) {
  return (
    <Card {...props} className={["auth-touch", className].filter(Boolean).join(" ")}>
      <div className="flex justify-center">
        <Wordmark height={40} />
      </div>
      {children}
    </Card>
  );
}
