'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import {
  isAdmin as checkAdmin,
  isDeveloper as checkDeveloper,
  isInternalUser as checkInternal,
} from '@/lib/adminAuth';

interface InternalUser {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
}

const currentUserKeys = {
  me: () => ['currentUser', 'me'] as const,
};

export function useCurrentUser() {
  const query = useQuery({
    queryKey: currentUserKeys.me(),
    queryFn: () => apiFetch<InternalUser>('internal/me'),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const roles = query.data?.roles ?? [];

  return {
    user: query.data ?? null,
    roles,
    isAdmin: checkAdmin(roles),
    isDeveloper: checkDeveloper(roles),
    isInternalUser: checkInternal(roles),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
