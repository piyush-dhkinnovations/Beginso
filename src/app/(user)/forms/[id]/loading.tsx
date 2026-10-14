import { RouteLoading } from '@/components/errors/RouteLoading';

// Keeps the generic page-shaped skeleton for everything under a single form (overview, inbox, builder ...), which the
// Forms list's own loading.tsx above must not replace.
export default function Loading() {
  return <RouteLoading />;
}
