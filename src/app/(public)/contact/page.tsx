export default function ContactPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900">Contact</h1>
        <p className="mt-4 text-lg text-gray-600">
          Have questions? We&apos;d love to hear from you.
        </p>
        <div className="mt-12 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email</h2>
            <p className="mt-1 text-gray-600">hello@squadpitch.com</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Support</h2>
            <p className="mt-1 text-gray-600">support@squadpitch.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
