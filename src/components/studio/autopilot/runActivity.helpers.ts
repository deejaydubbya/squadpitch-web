import type { AutopilotRun } from '@/hooks/useSquadpitch';

// Build a one-line suffix from the run's structured summary. Each
// fragment is short and only renders when the count is meaningful.
// Lives in its own .ts module so unit tests can import it without
// hitting the .tsx parent file's JSX.
export function runDetailFragments(run: AutopilotRun): string[] {
  const out: string[] = [];
  const s = run.metadata?.summary;
  if (s) {
    if ((s.duplicatesSuppressed ?? 0) > 0) {
      out.push(
        `collapsed ${s.duplicatesSuppressed} duplicate${s.duplicatesSuppressed === 1 ? '' : 's'}`,
      );
    }
    if ((s.listingsCappedByRunLimit ?? 0) > 0) {
      out.push(`${s.listingsCappedByRunLimit} more held for next run`);
    }
  }
  const a = run.metadata?.autoGenerate;
  if (a) {
    if ((a.draftsCreated ?? 0) > 0) {
      out.push(
        `auto-prepared ${a.draftsCreated} draft${a.draftsCreated === 1 ? '' : 's'}`,
      );
    }
    if ((a.skipped?.length ?? 0) > 0) {
      out.push(`${a.skipped!.length} held back from auto-generation`);
    }
  }
  return out;
}
