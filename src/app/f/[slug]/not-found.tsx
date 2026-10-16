import type { Metadata } from 'next';
import { FormUnavailable } from '@/components/public-form/FormUnavailable';

// A public link that resolves to nothing: a wrong or retired link, or a draft. Rendered through notFound() so the
// response carries a real HTTP 404 (it used to be a normal 200 page that only said "not found"). Next adds noindex.
export const metadata: Metadata = { title: 'Form not found' };

export default function PublicFormNotFound() {
  return <FormUnavailable notFound />;
}
