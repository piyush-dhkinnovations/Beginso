'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { teamService } from '@/services/team';
import { workspaceKeys } from '@/lib/queryKeys';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

export interface LeaveWorkspaceModalProps {
  /** The workspace to leave (its slug is what the backend call takes). */
  workspace: { slug: string; name: string } | null;
  onClose: () => void;
}

// One confirm for "Leave workspace", used from every place that offers it (the Team page and the All workspaces list). Any member can
// leave; the backend refuses the only owner (LAST_OWNER) and that message is shown as-is. The server is the authority, never this dialog.
export function LeaveWorkspaceModal({ workspace, onClose }: LeaveWorkspaceModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const leaveMutation = useMutation({
    mutationFn: (slug: string) => teamService.leave(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      toast('You left the workspace.', 'success');
      onClose();
      router.push('/workspaces');
    },
    onError: (error) => {
      onClose();
      toast(getFriendlyErrorMessage(error), 'error');
    },
  });

  return (
    <Modal
      isOpen={!!workspace}
      onClose={onClose}
      title={workspace ? `Leave ${workspace.name}?` : 'Leave this workspace?'}
      description="You will lose access to its forms and responses immediately. An owner or admin can invite you back."
    >
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" isLoading={leaveMutation.isPending} onClick={() => workspace && leaveMutation.mutate(workspace.slug)}>
          Leave workspace
        </Button>
      </div>
    </Modal>
  );
}
