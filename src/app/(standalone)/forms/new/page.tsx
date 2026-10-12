import { Suspense } from 'react';
import { CreateFormPage } from '@/components/forms/CreateFormPage';

// useSearchParams() (the ?ws= destination) needs a Suspense boundary under the App Router.
export default function NewFormPage() {
  return (
    <Suspense fallback={null}>
      <CreateFormPage />
    </Suspense>
  );
}
