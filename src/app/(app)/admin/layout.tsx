'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isInternalUser, isAdmin, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-sp-bg">
        <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError || !isInternalUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-sp-bg gap-4">
        <Shield className="w-12 h-12 text-white-30" />
        <h1 className="text-xl font-semibold text-white-100">Access Denied</h1>
        <p className="text-white-40 text-sm">You do not have permission to access the admin console.</p>
        <a
          href="/workspaces"
          className="mt-4 px-4 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors"
        >
          Back to workspaces
        </a>
      </div>
    );
  }

  const roleBadge = isAdmin ? 'Admin' : 'Developer';

  return (
    <div className="flex h-screen bg-sp-bg">
      <AdminSidebar isAdmin={isAdmin} roleBadge={roleBadge} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
