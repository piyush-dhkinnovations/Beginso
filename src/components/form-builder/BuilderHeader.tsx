'use client';

import { useState } from 'react';
import { CheckCircle2, ExternalLink, MoreVertical, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Menu, type MenuItem } from '@/components/ui/Menu';
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
  savedAt: Date | null;
  onRetrySave: () => void;
  /** The caller may publish (Owner/Admin). Without it there is no Publish button — a convenience; the server enforces. */
  canPublish: boolean;
  status: FormStatus;
  onTitleChange: (title: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  onClose: () => void;
  /** The caller may delete (Owner only). Otherwise the action is not offered; the server enforces. */
  canDelete: boolean;
  onDelete: () => void;
  onBack: () => void;
  /** Opens the Settings page of the builder (it is no longer a tab, so the ⋮ menu is its way in). */
  onOpenSettings: () => void;
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
  savedAt,
  onRetrySave,
  canPublish,
  status,
  onTitleChange,
  onPreview,
  onPublish,
  onClose,
  canDelete,
  onDelete,
  onBack,
  onOpenSettings,
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

  // Close/Delete are rare and destructive: they live in the ⋮ menu at every width.
  const overflowItems: MenuItem[] = [
    { id: 'settings', label: 'Form settings', icon: <Settings size={16} />, onSelect: onOpenSettings },
    ...(status === 'published' ? [{ id: 'close', label: 'Close form', onSelect: onClose }] : []),
    ...(canDelete ? [{ id: 'delete', label: 'Delete form', onSelect: onDelete, danger: true }] : []),
  ];

  return (
    <FormHeader
      onBack={onBack}
      icon={icon}
      backLabel="Forms"
      title={
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
          aria-label="Form name"
        />
      }
      badge={<StatusBadge variant={status}>{STATUS_LABEL[status]}</StatusBadge>}
      // One SaveIndicator instance (one live region).
      meta={<SaveIndicator dirty={dirty} saving={isSaving} error={saveFailed} savedAt={savedAt} onRetry={onRetrySave} />}
      actions={
        <>
          <Button onClick={onPreview} variant="secondary" aria-label="Preview">
            Preview
            <ExternalLink size={14} aria-hidden="true" className="ml-1.5" />
          </Button>

          {status === 'published' ? (
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

          {overflowItems.length > 0 && (
            <Menu align="end" triggerLabel="More form actions" trigger={<MoreVertical size={18} aria-hidden="true" />} items={overflowItems} />
          )}
        </>
      }
    />
  );
}
