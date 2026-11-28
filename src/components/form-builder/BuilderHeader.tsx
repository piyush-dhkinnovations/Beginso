'use client';

import { CharCount } from '@/components/ui/CharCount';
import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormHeader } from '@/components/forms/FormHeader';
import type { ReactNode } from 'react';
import { SaveIndicator } from './SaveIndicator';
import { useDesktop } from '@/hooks/useDesktop';
import { BUILDER_HEADER_SLOT_ID, BUILDER_SAVE_SLOT_ID } from '@/lib/formHeaderSlot';
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
  /** The form's logo button (see FormLogoButton); omitted = the default document icon. Not shown in the top bar. */
  icon?: ReactNode;
}

const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

const subscribeNever = () => () => {};
const topBarSlot = () => document.getElementById(BUILDER_HEADER_SLOT_ID);
const tabsSlot = () => document.getElementById(BUILDER_SAVE_SLOT_ID);

// The builder's form header: the title is an editable field, the muted line is the save state, and the actions are
// Preview / Publish. From 1024px the name, status and actions sit in the app's top bar and the save state in the middle of
// the tabs strip; below that (and wherever there is no top bar slot) it is the shared FormHeader at the top of the page.
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

  const desktop = useDesktop();
  const slot = useSyncExternalStore(subscribeNever, topBarSlot, () => null);
  const saveSlot = useSyncExternalStore(subscribeNever, tabsSlot, () => null);
  const inTopBar = desktop && !!slot;
  const size = inTopBar ? 'small' : undefined;

  const handleBlur = () => {
    if ((title || '').trim() && title !== formTitle) {
      onTitleChange(title);
    } else {
      setTitle(formTitle || '');
    }
  };

  const titleInput = (
    <>
      <input
        type="text"
        value={title ?? ''}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className={`min-w-0 rounded border-b-2 border-transparent bg-transparent px-1 font-semibold text-(--text-primary) transition-colors focus:border-b-(--border-strong) focus:outline-none ${
          // In the top bar the underline has a twin above it, or the name sits higher than the arrow and the status beside it.
          inTopBar ? 'max-w-full field-sizing-content border-t-2 py-0.5 bg-body' : 'py-0.5'
        }`}
        placeholder="Untitled Form"
        maxLength={100} // the server refuses a longer name
        title={title ?? ''}
        aria-label="Form name"
      />
      {(title ?? '').length >= 80 && <CharCount id="form-name-count" length={(title ?? '').length} max={100} />}
    </>
  );
  const badge = <StatusBadge variant={status}>{STATUS_LABEL[status]}</StatusBadge>;
  // One SaveIndicator instance (one live region).
  const saveState = (
    <SaveIndicator compact={inTopBar} dirty={dirty} saving={isSaving} error={saveFailed} detail={saveDetail} conflict={saveConflict} unsavedCount={unsavedCount} onReload={onReload} savedAt={savedAt} onRetry={onRetrySave} />
  );
  const actions = (
    <>
      <Button size={size} onClick={onPreview} variant="secondary" aria-label="Preview">
        Preview
        <ExternalLink size={14} aria-hidden="true" className="ml-1.5" />
      </Button>

      {status === 'published' && hasUnpublishedChanges ? (
        <div className="flex items-center gap-1">
          <Button
            size={size}
            variant="secondary"
            onClick={onPublishChanges}
            className="border-(--warning-border) bg-(--warning-surface) text-(--warning-text) hover:bg-(--warning-surface)"
            title="Your edits are not live yet. Click to update the real form."
          >
            <UploadCloud size={15} className="mr-1.5" aria-hidden="true" />
            Publish changes
          </Button>
          {onDiscardDraft && (
            <Button size={size} variant="ghost" onClick={onDiscardDraft} aria-label="Discard unpublished changes" title="Go back to the published form">
              Discard
            </Button>
          )}
        </div>
      ) : status === 'published' ? (
        canPublish ? (
          <Button size={size} variant="secondary" onClick={onPublish} title="Manage publishing">
            <CheckCircle2 size={15} className="mr-1.5 text-(--success-text)" aria-hidden="true" />
            Published
          </Button>
        ) : null
      ) : canPublish ? (
        <Button size={size} variant="primary" onClick={onPublish}>
          {status === 'closed' ? 'Re-publish' : 'Publish'}
        </Button>
      ) : null}
    </>
  );
  
  if (inTopBar) {
    return (
      <>
        {createPortal(
          <div className="flex min-w-0 flex-1 items-center gap-3 border-l border-(--border-default) pl-3">
            <Button variant="ghost" size="small" onClick={onBack} aria-label="Back to Forms" title="Back to Forms" className="bg-btn-icon shrink-0">
              <ArrowLeft size={18} className="bg-icon" />
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {titleInput}
              {badge}
            </div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          </div>,
          slot
        )}
        {saveSlot && createPortal(saveState, saveSlot)}
      </>
    );
  }

  return (
    <FormHeader
      onBack={onBack}
      icon={icon}
      backLabel="Forms"
      title={titleInput}
      badge={badge}
      meta={saveState}
      actions={actions}
    />
  );
}
