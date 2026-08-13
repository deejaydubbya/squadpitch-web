import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('workspace archive API contract', () => {
  it('sends the server-required confirmation from every workspace archive hook', () => {
    const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useSquadpitch.ts'), 'utf8');
    const archiveClient = hooks.match(/export function useArchiveClient[\s\S]*?onSuccess:/)?.[0] ?? '';
    const deleteWorkspace = hooks.match(/export function useDeleteWorkspace[\s\S]*?onSuccess:/)?.[0] ?? '';

    for (const archiveHook of [archiveClient, deleteWorkspace]) {
      expect(archiveHook).toContain("method: 'DELETE'");
      expect(archiveHook).toContain("body: JSON.stringify({ confirmation: 'ARCHIVE WORKSPACE' })");
    }
  });
});
