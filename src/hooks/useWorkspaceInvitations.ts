'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

export type WorkspaceInvitation = {
  id: string;
  clientId: string;
  businessName: string;
  industryKey: string;
  sourceType: 'PREPARED_WORKSPACE';
  prospectId: string;
  preparedPostCount: number;
  preparedPropertyCount: number;
  selectedChannels: string[];
  createdAt: string;
  expiresAt: string;
  previewPath: string;
};

export type WorkspaceInvitationsResponse = { invitations: WorkspaceInvitation[]; count: number };

export const workspaceInvitationKey = ['account', 'workspace-invitations'] as const;

export function useWorkspaceInvitations() {
  return useQuery({
    queryKey: workspaceInvitationKey,
    queryFn: () => apiFetch<WorkspaceInvitationsResponse>('workspace-invitations', { cache: 'no-store' }),
    staleTime: 30_000,
  });
}

export function useClaimWorkspaceInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ clientId: string; businessName: string; idempotent?: boolean }>(`prospect-claims/${id}/claim`, { method: 'POST', body: '{}' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceInvitationKey }),
        queryClient.invalidateQueries({ queryKey: ['squadpitch', 'clients'] }),
      ]);
    },
  });
}
