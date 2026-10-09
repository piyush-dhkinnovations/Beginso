import { Copy, Table2, Trash2, Edit2, BarChart2, MoreVertical, CheckSquare, FolderSymlink, LayoutDashboard, LayoutTemplate, Share2, Pin, PinOff, Archive, ArchiveRestore } from 'lucide-react';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { PinButton } from '@/components/forms/PinButton';
import { formHref } from '@/components/forms/formsListUtils';
import type { FormsPageState } from '@/hooks/useFormsPage';
import type { Form } from '@/types/form';
import type { FormsContext } from '@/types/workspace';

export function buildFormMenuItems(form: Form, s: FormsPageState, context: FormsContext): MenuItem[] {
  const formId = form._id;
  const { router, canDelete, selecting, onArchivedTab, canArchive, canMakeTemplate, duplicatingId, archivingId, deletingId } = s;
  return [
    {
      id: 'edit',
      label: 'Edit form',
      icon: <Edit2 className="bg-icon" />,
      onSelect: () => router.push(formHref(`/forms/${formId}/edit`, context)),
    },
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="bg-icon" />,
      onSelect: () => router.push(formHref(`/forms/${formId}/overview`, context)),
    },
    {
      id: 'responses',
      label: 'Open Responses',
      icon: <Table2 className="bg-icon" />,
      onSelect: () => router.push(formHref(`/forms/${formId}/inbox`, context)),
    },
    {
      id: 'analytics',
      label: 'Open Insights',
      icon: <BarChart2 className="bg-icon" />,
      onSelect: () => router.push(formHref(`/forms/${formId}/insights`, context)),
    },
    ...(canDelete && !selecting ? [{
      id: 'select',
      label: 'Select',
      icon: <CheckSquare className="bg-icon" />,
      onSelect: () => s.toggleSelected(formId),
    }] : []),
    ...(onArchivedTab ? [] : [{
      id: 'pin',
      label: form.pinned ? 'Unpin' : 'Pin to top',
      icon: form.pinned ? <PinOff className="bg-icon" /> : <Pin className="bg-icon" />,
      onSelect: () => s.pinMutation.mutate({ id: formId, pin: !form.pinned }),
    }]),
    {
      id: 'move',
      label: 'Move',
      icon: <FolderSymlink className="bg-icon" />,
      onSelect: () => s.setFormToMove(form),
    },
    {
      id: 'share',
      label: 'Share access',
      icon: <Share2 className="bg-icon" />,
      onSelect: () => s.setFormToShare(form),
    },
    {
      id: 'duplicate',
      label: duplicatingId === formId ? 'Duplicating…' : 'Duplicate',
      icon: <Copy className="bg-icon" />,
      disabled: duplicatingId === formId,
      onSelect: () => s.duplicateMutation.mutate(formId),
    },
    ...(canArchive
      ? [{
          id: 'archive',
          label: archivingId === formId ? 'Updating…' : onArchivedTab ? 'Unarchive' : 'Archive',
          icon: onArchivedTab ? <ArchiveRestore className="bg-icon" /> : <Archive className="bg-icon" />,
          disabled: archivingId === formId,
          onSelect: () => s.archiveMutation.mutate({ ids: [formId], archive: !onArchivedTab }),
        }]
      : []),
    ...(canMakeTemplate
      ? [{
          id: 'publish-template',
          label: 'Publish to templates',
          icon: <LayoutTemplate className="bg-icon" />,
          onSelect: () => s.setFormToTemplate(form),
        }]
      : []),
    ...(canDelete
      ? [{
          id: 'delete',
          label: deletingId === formId ? 'Moving to Trash…' : 'Delete',
          icon: <Trash2 className="bg-icon" />,
          disabled: deletingId === formId,
          danger: true,
          onSelect: () => s.setFormToDelete(form),
        }]
      : []),
  ];
}

export function renderRowMenu(form: Form, s: FormsPageState, context: FormsContext) {
  return <Menu trigger={<MoreVertical className="bg-icon" />} triggerLabel={`Actions for ${form.title}`} items={buildFormMenuItems(form, s, context)} align="end" />;
}

// Archived forms cannot be pinned (backend 409), so no pin affordance on that tab.
export function renderPinButton(form: Form, s: FormsPageState) {
  return s.onArchivedTab ? null : (
    <PinButton title={form.title} pinned={!!form.pinned} onToggle={() => s.pinMutation.mutate({ id: form._id, pin: !form.pinned })} />
  );
}
