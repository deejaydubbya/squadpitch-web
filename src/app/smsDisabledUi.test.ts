import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const notificationSettings = readFileSync(
  new URL(
    "./(app)/workspaces/[clientId]/settings/notifications/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const composer = readFileSync(
  new URL(
    "./(app)/workspaces/[clientId]/inbox/_components/Composer.tsx",
    import.meta.url,
  ),
  "utf8",
);
const consentPage = readFileSync(
  new URL("./sms-consent/page.tsx", import.meta.url),
  "utf8",
);

describe("disabled SMS UI", () => {
  it("shows an unavailable state without setup, toggle, phone, or test-send controls", () => {
    expect(notificationSettings).toContain("SMS — Temporarily unavailable");
    expect(notificationSettings).not.toContain("useTestSms");
    expect(notificationSettings).not.toContain("toggleGlobal('smsEnabled')");
    expect(notificationSettings).not.toContain("testSms.mutate");
    expect(notificationSettings).not.toContain('type="tel"');
  });

  it("keeps stale inbox SMS actions non-executable", () => {
    expect(composer).toContain(
      "SMS is temporarily unavailable and cannot be sent.",
    );
    expect(composer).toContain("pending || !body.trim() || isSms");
    expect(composer).toContain("SMS unavailable");
  });

  it("does not advertise an active SMS opt-in flow", () => {
    expect(consentPage).toContain("SMS — Temporarily unavailable");
    expect(consentPage).toContain("There is currently no SMS opt-in");
    expect(consentPage).not.toContain("enable SMS");
  });
});
