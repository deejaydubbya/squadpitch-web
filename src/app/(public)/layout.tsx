export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top bar — login only */}
      <nav className="absolute top-0 right-0 z-50 p-6">
        <a
          href="/auth/login?returnTo=/workspaces"
          className="text-sm px-5 py-2 rounded-lg bg-teal text-white font-medium hover:bg-teal-dark transition-colors"
        >
          Log in
        </a>
      </nav>

      <main>{children}</main>
    </div>
  );
}
