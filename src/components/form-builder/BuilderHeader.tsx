'use client';

import { CharCount } from '@/components/ui/CharCount';
import { useState } from 'react';
import { CheckCircle2, ExternalLink, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormHeader } from '@/components/forms/FormHeader';
import type { ReactNode } from 'react';
import { SaveIndicator } from './SaveIndicator';
import type { FormStatus } from '@/types/form';

export interface BuilderHeaderProps {
  formTitle: string;
  dirty: boolean;
  isSaving: boolean;
  saveFailed: boolean;
  /** The server's reason when a save was rejected ("Option value cannot be empty"). */
  saveDetail?: string | null;
  /** Another tab or person saved this form first (409 FORM_STALE). */
  saveConflict?: boolean;
  unsavedCount?: number;
  onReload?: () => void;
  savedAt: Date | null;
  onRetrySave: () => void;
  /** The caller may publish (Owner/Admin). Without it there is no Publish button — a convenience; the server enforces. */
  canPublish: boolean;
  status: FormStatus;
  /** True once an edit is staged on the draft (the form is published and someone changed it since): shows the orange "Publish changes" button
   * instead of the green "Published" one. Anyone who can save the form may use it — not only someone who can publish. */
  hasUnpublishedChanges?: boolean;
  onPublishChanges?: () => void;
  onDiscardDraft?: () => void;
  onTitleChange: (title: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  onBack: () => void;
  /** The form's logo button (see FormLogoButton); omitted = the default document icon. */
  icon?: ReactNode;
}

const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

// The builder's flavour of the shared FormHeader: the title is an editable field, the muted line is the save
// state, and the actions are Preview / Publish / ⋮ (Close, Delete). Everything else (frame, tabs) matches the
// Overview, Responses and Insights pages.
export function BuilderHeader({
  formTitle,
  dirty,
  isSaving,
  saveFailed,
  saveDetail,
  saveConflict,
  unsavedCount,
  onReload,
  savedAt,
  onRetrySave,
  canPublish,
  status,
  hasUnpublishedChanges,
  onPublishChanges,
  onDiscardDraft,
  onTitleChange,
  onPreview,
  onPublish,
  onBack,
  icon,
}: BuilderHeaderProps) {
  const [title, setTitle] = useState(formTitle || '');
  const [prevFormTitle, setPrevFormTitle] = useState<string | undefined>(formTitle);

  if (formTitle !== prevFormTitle) {
    setPrevFormTitle(formTitle);
    setTitle(formTitle || '');
  }

  const handleBlur = () => {
    if ((title || '').trim() && title !== formTitle) {
      onTitleChange(title);
    } else {
      setTitle(formTitle || '');
    }
  };

  return (
    <FormHeader
      onBack={onBack}
      icon={icon}
      backLabel="Forms"
      title={
        <>
        <input
          type="text"
          value={title ?? ''}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="min-w-0 rounded border-b-2 border-transparent bg-transparent px-1 py-0.5 font-semibold text-(--text-primary) transition-colors focus:border-(--border-strong) focus:outline-none"
          placeholder="Untitled Form"
          maxLength={100} // the server refuses a longer name
          title={title ?? ''}
          aria-label="Form name"
        />
        {(title ?? '').length >= 80 && <CharCount id="form-name-count" length={(title ?? '').length} max={100} />}
        </>
      }
      badge={<StatusBadge variant={status}>{STATUS_LABEL[status]}</StatusBadge>}
      // One SaveIndicator instance (one live region).
      meta={<SaveIndicator dirty={dirty} saving={isSaving} error={saveFailed} detail={saveDetail} conflict={saveConflict} unsavedCount={unsavedCount} onReload={onReload} savedAt={savedAt} onRetry={onRetrySave} />}
      actions={
        <>
          <Button onClick={onPreview} variant="secondary" aria-label="Preview">
            Preview
            <ExternalLink size={14} aria-hidden="true" className="ml-1.5" />
          </Button>

          {status === 'published' && hasUnpublishedChanges ? (
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                onClick={onPublishChanges}
                className="border-(--warning-border) bg-(--warning-surface) text-(--warning-text) hover:bg-(--warning-surface)"
                title="Your edits are not live yet. Click to update the real form."
              >
                <UploadCloud size={15} className="mr-1.5" aria-hidden="true" />
                Publish changes
              </Button>
              {onDiscardDraft && (
                <button
                  type="button"
                  onClick={onDiscardDraft}
                  aria-label="Discard unpublished changes"
                  title="Discard these changes"
                  className="flex size-8 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : status === 'published' ? (
            canPublish ? (
              <Button variant="secondary" onClick={onPublish} title="Manage publishing">
                <CheckCircle2 size={15} className="mr-1.5 text-(--success-text)" aria-hidden="true" />
                Published
              </Button>
            ) : null
          ) : canPublish ? (
            <Button variant="primary" onClick={onPublish}>
              {status === 'closed' ? 'Re-publish' : 'Publish'}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
