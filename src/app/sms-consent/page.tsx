export default function SmsConsentPage() {
  return (
    <div className="min-h-screen bg-[#111318] text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-6">
        <h1 className="text-2xl font-bold">SMS Notification Consent</h1>

        <section className="space-y-3 text-sm text-gray-300 leading-relaxed">
          <p>
            Squadpitch offers optional SMS notifications for critical account
            alerts. By enabling SMS notifications in your account settings, you
            consent to receive text messages from Squadpitch at the phone number
            you provide.
          </p>

          <h2 className="text-lg font-semibold text-white pt-2">What messages you will receive</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Post failed to publish</li>
            <li>Channel connection expired</li>
          </ul>
          <p>
            These are critical alerts only — Squadpitch does not send marketing
            or promotional messages via SMS.
          </p>

          <h2 className="text-lg font-semibold text-white pt-2">How to opt in</h2>
          <p>
            SMS notifications are disabled by default. To opt in, go to{' '}
            <strong>Settings &gt; Notifications</strong> in your Squadpitch
            dashboard, enable SMS, and enter your phone number.
          </p>

          <h2 className="text-lg font-semibold text-white pt-2">How to opt out</h2>
          <p>
            You can disable SMS notifications at any time by toggling off SMS in
            your notification settings, or by replying <strong>STOP</strong> to
            any message. You may also contact us at{' '}
            <a href="mailto:support@squadpitch.com" className="text-green-400 hover:underline">
              support@squadpitch.com
            </a>.
          </p>

          <h2 className="text-lg font-semibold text-white pt-2">Message frequency</h2>
          <p>
            Message frequency varies based on your account activity. Typically
            fewer than 5 messages per month. Messages are deduplicated with a
            5-minute window to prevent spam.
          </p>

          <h2 className="text-lg font-semibold text-white pt-2">Rates</h2>
          <p>
            Message and data rates may apply. Squadpitch does not charge for SMS
            notifications, but your carrier may.
          </p>
        </section>

        <p className="text-xs text-gray-500 pt-4 border-t border-gray-800">
          Squadpitch &middot; Last updated April 2026
        </p>
      </div>
    </div>
  );
}
