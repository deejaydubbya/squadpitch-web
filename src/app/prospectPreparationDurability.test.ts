import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const hook = fs.readFileSync(path.join(root, "src/hooks/useAdmin.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src/app/(app)/admin/prospects/[id]/page.tsx"), "utf8");

describe("authoritative prospect preparation UI", () => {
  it("polls from persisted server state after refresh", () => {
    expect(hook).toContain('includes(query.state.data?.preparationRun?.status');
    expect(hook).toContain("? 2_000 : false");
  });

  it("uses mutually exclusive running, complete, warning, and failed messages", () => {
    expect(page).toContain('run?.status === "COMPLETE"');
    expect(page).toContain('run?.status === "COMPLETE_WITH_WARNINGS"');
    expect(page).toContain('run?.status === "FAILED"');
    expect(page).toContain("preparationActive &&");
    expect(page).toContain("run.readyCount");
    expect(page).toContain("run.platformStates");
  });
});
