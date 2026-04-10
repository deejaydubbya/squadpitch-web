export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-4 text-sm text-gray-500">Last updated: April 2026</p>
        <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
          <h2 className="text-xl font-semibold text-gray-900 mt-8">Information We Collect</h2>
          <p>We collect information you provide when creating an account, including your email address and name via Auth0 authentication.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-8">How We Use Information</h2>
          <p>We use your information to provide the Squadpitch service, including AI content generation, content management, and social media publishing.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-8">Third-Party Services</h2>
          <p>We use Auth0 for authentication, OpenAI for content generation, Fal.ai for media generation, and Cloudinary for asset storage. Your data may be processed by these services.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-8">Data Security</h2>
          <p>We use encryption for sensitive data including OAuth tokens. All connections use HTTPS.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact</h2>
          <p>For privacy-related inquiries, contact privacy@squadpitch.com.</p>
        </div>
      </div>
    </div>
  );
}
