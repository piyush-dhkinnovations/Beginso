import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Product updates, guides and engineering notes from the Beginso team.',
};

export default function BlogLayout({ children }: { children: ReactNode }) {
  return children;
}
