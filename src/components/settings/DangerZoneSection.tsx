'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Download, Loader2 } from 'lucide-react';
import { settingsService } from '@/services/settings';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';
import type { WorkspaceExportJob } from '@/types/settings';

interface DangerZoneSectionProps {
  workspaceName: string;
}

// TODO: gate this whole section on workspace role once a real contract exists (same hook point
// as WorkspaceTab's name field — see that file's identical TODO / design.md §23 Risk 6). Every
// signed-in user is the sole owner of their one workspace today, so there's nothing real to gate.
export function DangerZoneSection({ workspaceName }: DangerZoneSectionProps) {
  const { toast } = useToast();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [job, setJob] = useState<WorkspaceExportJob | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const requestExportMutation = useMutation({
    mutationFn: () => settingsService.requestWorkspaceExport(),
    onSuccess: (createdJob) => {
      setJob(createdJob);
      setBlobUrl(null);
      setIsExportModalOpen(false);
    },
    onError: () => toast('Failed to start export. Please try again.', 'error'),
  });

  // No dedicated status-check endpoint is documented (requirements.md §15 item 12, still open) —
  // this probes readiness by attempting the actual download, since that's the only confirmed
  // endpoint. A 404 reads as "not ready yet" (stays queued); any other failure is treated as a
  // real error. See settingsService.getExportFileBlobUrl's comment for the full rationale.
  async function checkExportReady() {
    if (!job) return;
    setIsChecking(true);
    try {
      const url = await settingsService.getExportFileBlobUrl(job.id);
      setBlobUrl(url);
      setJob({ ...job, status: 'completed' });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        // Not ready yet — job stays queued/processing, user can check again shortly.
      } else {
        setJob({ ...job, status: 'failed' });
      }
    } finally {
      setIsChecking(false);
    }
  }

  function handleDownload() {
    if (!blobUrl || !job) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `workspace-export-${job.id}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <div>
        <p className="text-body-sm font-semibold text-rose-900">Danger Zone</p>
        <p className="text-caption text-rose-700 mt-1">
          Export or permanently delete this workspace. These actions affect all forms, responses,
          and files in your workspace.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-body-sm font-semibold text-neutral-800">Export workspace data</p>
          {!job ? (
            <Button
              variant="secondary"
              size="small"
              className="mt-2"
              isLoading={requestExportMutation.isPending}
              onClick={() => setIsExportModalOpen(true)}
            >
              Export Workspace Data
            </Button>
          ) : job.status === 'completed' ? (
            <Button variant="secondary" size="small" className="mt-2" onClick={handleDownload}>
              <Download size={14} className="mr-1.5" />
              Download export
            </Button>
          ) : job.status === 'failed' ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-caption text-rose-600">Something went wrong preparing your export.</p>
              <Button variant="secondary" size="small" onClick={() => setJob(null)}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-caption text-neutral-500">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Preparing your export…
              </span>
              <Button variant="secondary" size="small" isLoading={isChecking} onClick={() => void checkExportReady()}>
                Check if ready
              </Button>
            </div>
          )}
        </div>

        <div className="border-t border-rose-200 pt-3">
          <p className="text-body-sm font-semibold text-neutral-800">Delete workspace</p>
          <Button
            variant="destructive"
            size="small"
            className="mt-2"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete Workspace
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export workspace data?"
        description="This prepares a downloadable archive of your workspace data. It may take a few minutes to prepare — this doesn't affect or remove anything in your workspace."
      >
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button type="button" variant="secondary" onClick={() => setIsExportModalOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={requestExportMutation.isPending}
            onClick={() => requestExportMutation.mutate()}
          >
            Start export
          </Button>
        </div>
      </Modal>

      <DeleteWorkspaceModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        workspaceName={workspaceName}
      />
    </div>
  );
}
