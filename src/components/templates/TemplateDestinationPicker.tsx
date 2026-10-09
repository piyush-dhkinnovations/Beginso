'use client';

import { useState } from 'react';
import { ArrowRight, Info, Lock, Monitor, User, Users, MessageSquare, Folder } from 'lucide-react';
import type { ComponentType } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';
import { useWorkspaceList } from '@/hooks/useWorkspaceDestinations';
import { hasCapability } from '@/lib/roles';
import { bx } from '@/lib/utils';
import type { FormDestination, Workspace } from '@/types/workspace';

export interface TemplateDestinationPickerProps {
  /** `workspaceSlug` is passed alongside a workspace destination so the caller can build the
   * `?ws=<slug>` URL hint (CreateFormModal.tsx's own post-create redirect convention) without a
   * second workspace-list fetch — this component already has it loaded. */
  onConfirm: (destination: FormDestination, workspaceSlug?: string) => void;
  isSubmitting: boolean;
}

type Choice = 'personal' | 'workspace';

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const PERSONAL_FEATURES: Feature[] = [
  { icon: Lock, title: 'Private and secure', body: 'Only you can view and edit this form.' },
  { icon: Monitor, title: 'Great for drafts', body: 'Keep your work-in-progress safe.' },
  { icon: User, title: 'Full control', body: 'Manage, edit, or move it anytime.' },
];

const WORKSPACE_FEATURES: Feature[] = [
  { icon: Users, title: 'Shared with your team', body: 'Everyone in the workspace can view and edit.' },
  { icon: MessageSquare, title: 'Collaborate easily', body: 'Work together in real time.' },
  { icon: Folder, title: 'Keep things organized', body: 'Store forms in a shared workspace.' },
];

// .kiro/specs/public-template-gallery requirements.md Requirement 7 / design.md "Half B" — the
// destination step inserted into the template-apply flow before the form is actually created.
// Mirrors C1.9's already-locked requirement ("name the destination before the builder opens...
// personal space plus every workspace where the user holds the create-form permission... state
// the consequence in plain words") — already built once as a Select dropdown in
// CreateFormModal.tsx. This is the same logic, presented as two cards per product direction.
//
// Built entirely from existing beginso-ui.css classes (.bg-card/.bg-card-interactive/
// .bg-card-selected, .bg-stat-icon, .bg-radio, bg-h*/bg-body*) and the shared Button/Select
// components — no invented colors or one-off styles — so light/dark theme both work
// automatically via those classes' existing [data-theme]/prefers-color-scheme definitions, the
// same way every other page in the app does.
export function TemplateDestinationPicker({ onConfirm, isSubmitting }: TemplateDestinationPickerProps) {
  const [choice, setChoice] = useState<Choice>('personal');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);

  const { data: allWorkspaces = [], isLoading } = useWorkspaceList();
  // Requirement 7.3 — only workspaces the user actually holds create-form permission in.
  const workspaces = allWorkspaces.filter((ws) => hasCapability(ws.role, 'forms:create'));

  const handleWorkspaceCreated = (workspace: Workspace) => {
    setIsCreateWorkspaceOpen(false);
    setSelectedWorkspaceId(workspace.id);
  };

  const canConfirm = choice === 'personal' || (choice === 'workspace' && selectedWorkspaceId !== null);

  const handleConfirm = () => {
    if (choice === 'personal') {
      onConfirm({ type: 'personal' });
    } else if (selectedWorkspaceId) {
      const slug = workspaces.find((ws) => ws.id === selectedWorkspaceId)?.slug;
      onConfirm({ type: 'workspace', workspaceId: selectedWorkspaceId }, slug);
    }
  };

  return (
    <div className="min-h-screen bg-(--bg-page) px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="bg-h1 text-(--text-primary)">Where should this form live?</h1>
          <p className="mt-2 bg-body text-(--text-secondary)">
            You can move it later if you change your mind.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DestinationCard
            selected={choice === 'personal'}
            onSelect={() => setChoice('personal')}
            icon={User}
            title="Personal space"
            subtitle="Only visible to you."
            features={PERSONAL_FEATURES}
          />
          <DestinationCard
            selected={choice === 'workspace'}
            onSelect={() => setChoice('workspace')}
            icon={Users}
            title="Workspace"
            subtitle="Visible to everyone in that workspace."
            features={WORKSPACE_FEATURES}
          />
        </div>

        {choice === 'workspace' && !isLoading && (
          <div className="mt-5">
            {workspaces.length === 0 ? (
              <div className="bg-card bg-card-pad flex flex-col items-center gap-3 border-dashed text-center">
                <p className="bg-body-sm text-(--text-secondary)">You don&apos;t have a workspace yet.</p>
                <Button type="button" variant="secondary" onClick={() => setIsCreateWorkspaceOpen(true)}>
                  Create a workspace
                </Button>
              </div>
            ) : (
              <div className="bg-card bg-card-pad mx-auto max-w-sm">
                <Select
                  id="destination-workspace-select"
                  label="Which workspace?"
                  value={selectedWorkspaceId ?? ''}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
                >
                  <option value="" disabled>
                    Choose a workspace…
                  </option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        <p className="mt-7 flex items-center justify-center gap-2 text-center bg-caption text-(--text-muted)">
          <Info size={15} className="shrink-0" />
          <span>
            Forms in <strong className="text-(--text-secondary)">Personal space</strong> are
            visible only to you. Forms in a{' '}
            <strong className="text-(--text-secondary)">workspace</strong> are visible to
            everyone in that workspace.
          </span>
        </p>

        <div className="mx-auto mt-6 max-w-md">
          <Button
            type="button"
            variant="primary"
            className="w-full gap-2"
            disabled={!canConfirm}
            isLoading={isSubmitting}
            onClick={handleConfirm}
          >
            Use this template
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onCreated={handleWorkspaceCreated}
      />
    </div>
  );
}

interface DestinationCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  features: Feature[];
}

function DestinationCard({ selected, onSelect, icon: Icon, title, subtitle, features }: DestinationCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={bx('bg-card bg-card-pad bg-card-interactive bg-card-hover text-left', selected && 'bg-card-selected')}
    >
      <div className="flex items-start justify-between">
        <span className="bg-stat-icon">
          <Icon className="bg-icon" />
        </span>
        <input type="radio" readOnly checked={selected} className="bg-radio" aria-hidden="true" tabIndex={-1} />
      </div>

      <div>
        <h3 className="bg-h5 text-(--text-primary)">{title}</h3>
        <p className="bg-body-sm text-(--text-muted)">{subtitle}</p>
      </div>

      <div className="border-t border-(--border-default)" />

      <div className="flex flex-col gap-3">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-3">
            <span className="bg-stat-icon">
              <f.icon className="bg-icon" />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-(--text-primary)">{f.title}</div>
              <div className="text-[12.5px] text-(--text-muted)">{f.body}</div>
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}
