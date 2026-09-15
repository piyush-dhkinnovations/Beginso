'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Table, type TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { formAccessService } from '@/services/formAccess';
import { formAccessKeys } from '@/lib/queryKeys';
import { formAccessSchema, type FormAccessValues } from '@/lib/schemas/formAccessSchema';
import { ROLE_LABELS } from '@/lib/roles';
import { useToast } from '@/components/common/Toast';
import type { FormAccessGrant } from '@/types/team';

export interface FormAccessPanelProps {
  formId: string;
  formTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

// requirements.md §7.8, design.md §6/§15.5. Mirrors MoveFormModal's fetch-on-open pattern (query
// gated on `enabled: isOpen`) — works identically whether formId belongs to a workspace form or
// a personal one, since the endpoint itself is scoped only by form (design.md §11.2's own note).
//
// Unlike InviteMembersModal/MoveFormModal, a successful grant does NOT close the panel — this is
// a list-manager (share with several people over one visit, watch the list grow), not a
// single-submission form, so only the inputs reset. Requirements.md §7.8/design.md §6 describe no
// confirmation modal for revoke (unlike remove-member/revoke-invite, which requirements.md §11
// names explicitly) — an icon-button revoke fires immediately, matching that literal scope.
export function FormAccessPanel({ formId, formTitle, isOpen, onClose }: FormAccessPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const {
    data: grants,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: formAccessKeys.grants(formId),
    queryFn: () => formAccessService.listGrants(formId),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormAccessValues>({
    resolver: zodResolver(formAccessSchema),
    defaultValues: { role: 'viewer' },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ email: '', role: 'viewer' });
      setTimeout(() => emailInputRef.current?.focus(), 50);
    }
  }, [isOpen, reset]);

  const grantMutation = useMutation({
    mutationFn: (data: FormAccessValues) => formAccessService.grant(formId, data.email, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formAccessKeys.grants(formId) });
      reset({ email: '', role: 'viewer' });
      emailInputRef.current?.focus();
      toast('Access granted', 'success');
    },
    onError: () => toast('Failed to grant access. Please try again.', 'error'),
  });

  const revokeMutation = useMutation({
    mutationFn: (grant: FormAccessGrant) => formAccessService.revoke(formId, grant.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formAccessKeys.grants(formId) });
      toast('Access revoked', 'success');
    },
    onError: () => toast('Failed to revoke access. Please try again.', 'error'),
  });

  const columns: TableColumn<FormAccessGrant>[] = [
    { key: 'email', header: 'Email', render: (g) => <span className="text-body-sm font-medium">{g.email}</span> },
    { key: 'role', header: 'Role', render: (g) => <Badge variant="outline">{ROLE_LABELS[g.role]}</Badge> },
    {
      key: 'revoke',
      header: '',
      align: 'right',
      render: (g) => (
        <Button
          type="button"
          variant="ghost"
          size="small"
          aria-label={`Revoke access for ${g.email}`}
          onClick={() => revokeMutation.mutate(g)}
        >
          <X size={14} />
        </Button>
      ),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share access to ${formTitle}`}>
      <div className="flex flex-col gap-4">
        <form onSubmit={handleSubmit((data) => grantMutation.mutate(data))} className="flex flex-col gap-4">
          <Input
            id="form-access-email-input"
            label="Email"
            placeholder="sam@company.com"
            error={errors.email?.message}
            {...register('email')}
            ref={(el) => {
              (register('email') as { ref: (el: HTMLInputElement | null) => void }).ref(el);
              (emailInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            }}
          />

          <Select id="form-access-role-select" label="Role" error={errors.role?.message} {...register('role')}>
            <option value="member">Editor — can build and edit forms</option>
            <option value="viewer">Reviewer — can review assigned responses</option>
            <option value="admin">Admin — full workspace access</option>
          </Select>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={grantMutation.isPending}>
              Grant Access
            </Button>
          </div>
        </form>

        {isError ? (
          <Alert variant="error" title="Could not load existing access. Try again.">
            <Button variant="secondary" size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        ) : (
          <Table
            columns={columns}
            rows={grants ?? []}
            rowKey={(g) => g.userId}
            isLoading={isLoading}
            skeletonRows={2}
            emptyState={
              <EmptyState
                title="No one else has access yet."
                description="Share this form with someone by email — they don't need to join the workspace."
              />
            }
          />
        )}
      </div>
    </Modal>
  );
}
