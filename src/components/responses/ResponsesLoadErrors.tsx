'use client';

import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function FormLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const router = useRouter();
  const statusCode = isAxiosError(error) ? error.response?.status : undefined;
  const isAccessDenied = statusCode === 403;
  const isNotFound = statusCode === 404;
  return (
    <EmptyState illustration={isAccessDenied ? 'no-access' : isNotFound ? 'not-found' : 'error'}
      icon={isAccessDenied ? <LockKeyhole /> : isNotFound ? <FileText /> : <AlertCircle />}
      title={isAccessDenied ? 'Access denied' : isNotFound ? 'Form not found' : 'Unable to load form'}
      description={
        isAccessDenied
          ? "You don't have permission to view this form's responses."
          : isNotFound
            ? "This form doesn't exist or may have been deleted."
            : 'Something went wrong while loading this form.'
      }
      actions={
        isAccessDenied || isNotFound ? (
          <Button onClick={() => router.push('/forms')}>Go to Forms</Button>
        ) : (
          <Button onClick={onRetry}>Try again</Button>
        )
      }
    />
  );
}

export function ResponsesListError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState illustration="error"
      icon={<AlertCircle />}
      title="Unable to load responses"
      description="The response list could not be loaded. Please try again."
      actions={<Button onClick={onRetry}>Try again</Button>}
    />
  );
}

export function NoResponsesYet({ formId }: { formId?: string }) {
  const router = useRouter();
  return (
    <EmptyState
      illustration="empty-inbox"
      icon={<FileText />}
      title="No responses yet"
      description="Once someone submits your published form, their answers land here. Share the link to get started."
      actions={
        formId ? (
          <Button variant="secondary" onClick={() => router.push(`/forms/${formId}/edit?tab=share`)}>
            Share Form
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => router.push('/forms')}>
            Go to Forms
          </Button>
        )
      }
    />
  );
}
