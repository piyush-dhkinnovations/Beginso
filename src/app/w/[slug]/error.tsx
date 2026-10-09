'use client';

import { RouteError } from '@/components/errors/RouteError';

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} homeHref="/workspaces" />;
}
