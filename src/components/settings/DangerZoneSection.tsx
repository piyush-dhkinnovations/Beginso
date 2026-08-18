'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { settingsService } from '@/services/settings';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';
import type { WorkspaceExportJob } from '@/types/settings';

function shouldPollExportJob(status: WorkspaceExportJob['status']): boolean {
  return status === 'queued' || status === 'processing';
}

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const requestExportMutation = useMutation({
    mutationFn: () => settingsService.requestWorkspaceExport(),
    onSuccess: (createdJob) => {
      setJobId(createdJob.id);
      setIsExportModalOpen(false);
    },
    onError: () => toast('Failed to start export. Please try again.', 'error'),
  });

  // Confirmed live 17 Aug 2026 (settingsService.getExportStatus) — same queued/processing-until-
  // terminal auto-poll pattern Sprint 5's shouldPollReportJob already established for Reports,
  // now that a real status endpoint exists (this was a manual "Check if ready" button until then;
  // see tasks.md's Notes for why that interim design existed).
  const statusQuery = useQuery({
    queryKey: ['workspace-export-status', jobId],
    queryFn: () => settingsService.getExportStatus(jobId as string),
    enabled: jobId !== null,
    refetchInterval: (query) => (query.state.data && shouldPollExportJob(query.state.data.status) ? 5000 : false),
  });

  const status = statusQuery.data?.status;

  // Never cached across clicks (matches ReportJobRow's identical download handler) — fetched
  // fresh on click rather than pre-fetched during polling, so a completed-but-never-downloaded
  // export doesn't hold an unused blob URL in memory.
  async function handleDownload() {
    if (!jobId) return;
    setIsDownloading(true);
    try {
      const url = await settingsService.getExportFileBlobUrl(jobId);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workspace-export-${jobId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast('Failed to download export. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
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
          {!jobId ? (
            <Button
              variant="secondary"
              size="small"
              className="mt-2"
              isLoading={requestExportMutation.isPending}
              onClick={() => setIsExportModalOpen(true)}
            >
              Export Workspace Data
            </Button>
          ) : status === 'completed' ? (
            <Button
              variant="secondary"
              size="small"
              className="mt-2"
              isLoading={isDownloading}
              onClick={() => void handleDownload()}
            >
              <Download size={14} className="mr-1.5" />
              Download export
            </Button>
          ) : status === 'failed' ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-caption text-rose-600">Something went wrong preparing your export.</p>
              <Button variant="secondary" size="small" onClick={() => setJobId(null)}>
                Try again
              </Button>
            </div>
          ) : (
            <span className="mt-2 inline-flex items-center gap-1.5 text-caption text-neutral-500">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Preparing your export…
            </span>
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
