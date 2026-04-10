import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold text-teal">
              Squadpitch
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-sm text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">About</Link>
              <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <a href="/auth/login?returnTo=/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Log in</a>
              <a href="/auth/login?screen_hint=signup&returnTo=/dashboard" className="text-sm px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark">
                Get started
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Product</h3>
              <div className="space-y-2">
                <Link href="/features" className="block text-sm text-gray-500 hover:text-teal">Features</Link>
                <Link href="/pricing" className="block text-sm text-gray-500 hover:text-teal">Pricing</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Company</h3>
              <div className="space-y-2">
                <Link href="/about" className="block text-sm text-gray-500 hover:text-teal">About</Link>
                <Link href="/contact" className="block text-sm text-gray-500 hover:text-teal">Contact</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Legal</h3>
              <div className="space-y-2">
                <Link href="/terms" className="block text-sm text-gray-500 hover:text-teal">Terms of Service</Link>
                <Link href="/privacy" className="block text-sm text-gray-500 hover:text-teal">Privacy Policy</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-teal mb-3">Squadpitch</p>
              <p className="text-sm text-gray-500">AI-powered social media content studio.</p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Squadpitch. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
