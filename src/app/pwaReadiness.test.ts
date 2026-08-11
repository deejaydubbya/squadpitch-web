import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('PWA readiness and mobile browser metadata', () => {
  it('publishes an installable manifest using existing production assets', () => {
    const manifest = source('src/app/manifest.ts');

    expect(manifest).toContain("name: 'Squadpitch'");
    expect(manifest).toContain("short_name: 'Squadpitch'");
    expect(manifest).toContain("start_url: '/workspaces'");
    expect(manifest).toContain("display: 'standalone'");
    expect(manifest).toContain("src: '/icon-192.png'");
    expect(manifest).toContain("src: '/icon-512.png'");
    expect(manifest).toContain("purpose: 'any'");
    expect(manifest).not.toContain('maskable');
  });

  it('declares mobile and Apple browser metadata', () => {
    const layout = source('src/app/layout.tsx');

    expect(layout).toContain("manifest: '/manifest.webmanifest'");
    expect(layout).toContain('appleWebApp');
    expect(layout).toContain("statusBarStyle: 'black-translucent'");
    expect(layout).toContain("viewportFit: 'cover'");
    expect(layout).toContain("colorScheme: 'dark'");
    expect(layout).toContain("url: '/apple-icon.png'");
  });

  it('keeps the service worker push-only and same-origin', () => {
    const worker = source('public/sw.js');

    expect(worker).toContain("addEventListener('push'");
    expect(worker).toContain("addEventListener('notificationclick'");
    expect(worker).not.toContain("addEventListener('fetch'");
    expect(worker).not.toContain('caches.open');
    expect(worker).toContain('url.origin !== self.location.origin');
    expect(worker).toContain("clients.matchAll({ type: 'window'");
  });

  it('reports offline state without caching or queueing writes', () => {
    const appLayout = source('src/app/(app)/layout.tsx');
    const banner = source('src/components/mobile/ConnectivityBanner.tsx');

    expect(appLayout).toContain('<ConnectivityBanner />');
    expect(banner).toContain('useSyncExternalStore');
    expect(banner).toContain("window.addEventListener('offline'");
    expect(banner).toContain('role="status"');
    expect(banner).toContain('Changes cannot be saved');
  });
});
