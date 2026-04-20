import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import type { InlineActionInput, InlineActionResult } from '@/lib/inlineActions/types';

export function useInlineAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InlineActionInput) =>
      apiFetch<InlineActionResult>(`drafts/${input.draftId}/inline-action`, {
        method: 'POST',
        body: JSON.stringify({
          actionType: input.type,
          params: input.params,
          preferencesContext: input.preferencesContext ?? undefined,
        }),
      }),
    onSuccess: (result) => {
      if (result.outputMode === 'duplicate') {
        qc.invalidateQueries({ queryKey: ['squadpitch', 'drafts'] });
      }
    },
  });
}
