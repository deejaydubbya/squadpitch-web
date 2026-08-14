import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');

describe('agent referral experience', () => {
  it('captures through a public route into a secure first-touch cookie', () => {
    const route = source('src/app/r/[code]/route.ts');
    expect(route).toContain('/api/public/referrals/');
    expect(route).toContain("httpOnly: true");
    expect(route).toContain("sameSite: 'lax'");
    expect(route).toContain("returnTo=/referrals");
  });

  it('automatically attaches after Auth0 without exposing the cookie to client code', () => {
    const attach = source('src/app/api/referrals/attach/route.ts');
    const capture = source('src/components/referrals/ReferralAttributionCapture.tsx');
    expect(attach).toContain("request.cookies.get('sp_referral_capture')");
    expect(attach).toContain('/api/v1/referrals/attribution');
    expect(capture).toContain("fetch('/api/referrals/attach'");
    expect(capture).not.toContain('document.cookie');
  });

  it('shows accurate reward terms, copy action, history, and responsive layouts', () => {
    const page = source('src/app/(app)/referrals/page.tsx');
    expect(page).toContain('remain qualified for 14 days');
    expect(page).toContain('$59 account credit');
    expect(page).toContain('navigator.clipboard.writeText');
    expect(page).toContain('sm:grid-cols-2');
    expect(page).toContain('No referrals yet');
  });

  it('links customer desktop/mobile and admin navigation', () => {
    expect(source('src/components/studio/Sidebar.tsx')).toContain('Refer an agent');
    expect(source('src/components/studio/WorkspaceMoreMenu.tsx')).toContain('Refer an agent');
    expect(source('src/components/admin/AdminSidebar.tsx')).toContain("href: '/admin/referrals'");
  });
});
