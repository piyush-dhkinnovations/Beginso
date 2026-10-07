'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import type { FormDestination, FormsContext } from '@/types/workspace';

export interface MoveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formTitle: string;
  currentContext?: FormsContext;
}

// Wireframe Screen 35: Move Form (requirements.md §7.9, B1.3, design.md §15.8).
// Allows moving a form between personal space and workspaces.
// Invalidates both source and destination query caches on success.
export function MoveFormModal({
  isOpen,
  onClose,
  formId,
  formTitle,
  currentContext = { type: 'personal' },
}: MoveFormModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: isOpen,
  });

  // Filter out current context from destination options
  const availableWorkspaces = workspaces.filter((ws) =>
    currentContext.type === 'workspace' ? ws.id !== currentContext.workspaceId : true
  );

  const [selectedDestination, setSelectedDestination] = useState<string>(
    currentContext.type === 'personal' && availableWorkspaces.length > 0
      ? availableWorkspaces[0].id
      : 'personal'
  );

  const moveMutation = useMutation({
    mutationFn: (destination: FormDestination) => formsService.moveForm(formId, destination),
    onSuccess: (_, destination) => {
      // Invalidate both source and destination forms queries
      queryClient.invalidateQueries({ queryKey: workspaceKeys.forms(currentContext) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.forms(destination) });
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast('Form moved successfully', 'success');
      onClose();
    },
    onError: () => {
      toast('Failed to move form. Please try again.', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const destination: FormDestination =
      selectedDestination === 'personal'
        ? { type: 'personal' }
        : { type: 'workspace', workspaceId: selectedDestination };

    moveMutation.mutate(destination);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Move ${formTitle}`}
      description="Choose where this form should live. Its responses, files, analytics history and public URL move with it."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          id="move-destination-select"
          label="Destination"
          value={selectedDestination}
          onChange={(e) => setSelectedDestination(e.target.value)}
        >
          {currentContext.type !== 'personal' && (
            <option value="personal">No workspace (personal)</option>
          )}
          {availableWorkspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </Select>

        <Alert variant="warning">
          Assignees who are not members of the destination will be marked Unassigned. Notes stay attached to responses.
        </Alert>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={moveMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={moveMutation.isPending}>
            Move form
          </Button>
        </div>
      </form>
    </Modal>
  );
}
