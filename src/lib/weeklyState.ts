/**
 * Weekly Loop state helpers.
 *
 * Derives weekly progress from real draft data — no backend dependency.
 * All date math uses the user's local timezone (Monday → Sunday weeks).
 */

import type { Draft } from '@/hooks/useSquadpitch';

// ── Constants ──────────────────────────────────────────────────────────

const DEFAULT_WEEKLY_TARGET = 3;
const LS_LAST_VISIT = 'sp_last_dashboard_visit';
const LS_STREAK = 'sp_weekly_streak';

// ── Week range helpers ─────────────────────────────────────────────────

export interface WeekRange {
  /** Monday 00:00:00 local */
  start: Date;
  /** Sunday 23:59:59.999 local */
  end: Date;
  /** ISO date string for start (YYYY-MM-DD) */
  startISO: string;
  /** ISO date string for end (YYYY-MM-DD) */
  endISO: string;
}

/** Returns the current week range (Monday → Sunday, local timezone). */
export function currentWeekRange(now = new Date()): WeekRange {
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startISO: toISODate(start),
    endISO: toISODate(end),
  };
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Weekly state derivation ────────────────────────────────────────────

export interface WeeklyState {
  /** Current week range */
  week: WeekRange;
  /** Target number of posts per week */
  weeklyTarget: number;
  /** Posts published this week */
  postsPublishedThisWeek: number;
  /** Posts scheduled for this week */
  postsScheduledThisWeek: number;
  /** Total posts ready (published + scheduled) */
  postsReadyThisWeek: number;
  /** Progress percentage (0–100) */
  weeklyProgressPercent: number;
  /** Whether the weekly target has been met */
  targetMet: boolean;
  /** Days remaining in the week (including today) */
  daysRemaining: number;
  /** Drafts associated with this week (published or scheduled this week) */
  weeklyDrafts: Draft[];
  /** Smart nudge message */
  nudge: WeeklyNudge;
  /** Consecutive weeks with at least 1 post */
  streak: number;
}

export interface WeeklyNudge {
  message: string;
  type: 'empty' | 'progress' | 'schedule' | 'ontrack' | 'urgency';
}

/** Derive weekly state from drafts array and summary data. */
export function deriveWeeklyState(
  drafts: Draft[] | undefined,
  opts: {
    publishedThisWeek?: number;
    scheduledUpcoming?: number;
    weeklyTarget?: number;
    now?: Date;
  } = {},
): WeeklyState {
  const now = opts.now ?? new Date();
  const week = currentWeekRange(now);
  const weeklyTarget = opts.weeklyTarget ?? DEFAULT_WEEKLY_TARGET;

  // Filter drafts into this-week buckets
  const weeklyDrafts: Draft[] = [];
  let postsPublishedThisWeek = 0;
  let postsScheduledThisWeek = 0;

  if (drafts) {
    for (const d of drafts) {
      const pubDate = d.publishedAt ? new Date(d.publishedAt) : null;
      const schedDate = d.scheduledFor ? new Date(d.scheduledFor) : null;

      if (d.status === 'PUBLISHED' && pubDate && pubDate >= week.start && pubDate <= week.end) {
        postsPublishedThisWeek++;
        weeklyDrafts.push(d);
      } else if (d.status === 'SCHEDULED' && schedDate && schedDate >= week.start && schedDate <= week.end) {
        postsScheduledThisWeek++;
        weeklyDrafts.push(d);
      }
    }
  }

  // If the backend summary has higher counts (e.g., drafts beyond limit), prefer those
  if (opts.publishedThisWeek !== undefined && opts.publishedThisWeek > postsPublishedThisWeek) {
    postsPublishedThisWeek = opts.publishedThisWeek;
  }

  const postsReadyThisWeek = postsPublishedThisWeek + postsScheduledThisWeek;
  const weeklyProgressPercent = Math.min(100, Math.round((postsReadyThisWeek / weeklyTarget) * 100));
  const targetMet = postsReadyThisWeek >= weeklyTarget;

  // Days remaining (Sunday = last day of week)
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysRemaining = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1; // +1 because includes today

  // Smart nudge
  const nudge = computeNudge(postsReadyThisWeek, postsScheduledThisWeek, weeklyTarget, daysRemaining, targetMet);

  // Streak
  const streak = readStreak();

  return {
    week,
    weeklyTarget,
    postsPublishedThisWeek,
    postsScheduledThisWeek,
    postsReadyThisWeek,
    weeklyProgressPercent,
    targetMet,
    daysRemaining,
    weeklyDrafts: weeklyDrafts.sort((a, b) => {
      const aDate = a.scheduledFor ?? a.publishedAt ?? a.createdAt;
      const bDate = b.scheduledFor ?? b.publishedAt ?? b.createdAt;
      return aDate > bDate ? 1 : -1;
    }),
    nudge,
    streak,
  };
}

// ── Nudge logic ────────────────────────────────────────────────────────

function computeNudge(
  postsReady: number,
  postsScheduled: number,
  target: number,
  daysRemaining: number,
  targetMet: boolean,
): WeeklyNudge {
  if (targetMet) {
    return { message: "You're on track this week", type: 'ontrack' };
  }

  if (postsReady === 0) {
    return { message: "Let's create your first post this week", type: 'empty' };
  }

  if (daysRemaining <= 2) {
    const remaining = target - postsReady;
    return {
      message: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left this week \u2014 ${remaining > 0 ? `create ${remaining} more post${remaining === 1 ? '' : 's'}` : 'schedule your posts'}`,
      type: 'urgency',
    };
  }

  if (postsScheduled === 0 && postsReady > 0) {
    return { message: 'Schedule your posts for better reach', type: 'schedule' };
  }

  const remaining = target - postsReady;
  return {
    message: `Create ${remaining} more post${remaining === 1 ? '' : 's'} to stay consistent`,
    type: 'progress',
  };
}

// ── Return detection ───────────────────────────────────────────────────

export interface ReturnInfo {
  /** Whether user is returning after inactivity */
  isReturning: boolean;
  /** Days since last dashboard visit */
  daysSinceLastVisit: number;
}

/** Check if the user is returning after inactivity (>24h). */
export function checkReturnStatus(): ReturnInfo {
  try {
    const last = localStorage.getItem(LS_LAST_VISIT);
    if (!last) {
      return { isReturning: false, daysSinceLastVisit: 0 };
    }

    const lastDate = new Date(last);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      isReturning: diffDays >= 1,
      daysSinceLastVisit: diffDays,
    };
  } catch {
    return { isReturning: false, daysSinceLastVisit: 0 };
  }
}

/** Record the current visit timestamp. */
export function recordVisit() {
  try {
    localStorage.setItem(LS_LAST_VISIT, new Date().toISOString());
  } catch {
    // Storage unavailable
  }
}

// ── Streak tracking ────────────────────────────────────────────────────

interface StreakData {
  count: number;
  /** ISO week string (e.g. "2026-W17") of the last recorded week */
  lastWeek: string;
}

function getISOWeek(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((d.getTime() - jan4.getTime()) / 86400000) + 4;
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getPrevISOWeek(weekStr: string): string {
  // Parse "YYYY-WNN" and go back 7 days from the start of that week
  const [yearStr, wStr] = weekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);

  // Find the Monday of the given ISO week
  const jan4 = new Date(year, 0, 4);
  const dayOfJan4 = jan4.getDay() || 7; // 1=Mon..7=Sun
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfJan4 + 1);
  const targetMonday = new Date(mondayOfWeek1);
  targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);

  // Go back 7 days
  const prevMonday = new Date(targetMonday);
  prevMonday.setDate(targetMonday.getDate() - 7);
  return getISOWeek(prevMonday);
}

function readStreak(): number {
  try {
    const raw = localStorage.getItem(LS_STREAK);
    if (!raw) return 0;
    const data: StreakData = JSON.parse(raw);
    return data.count;
  } catch {
    return 0;
  }
}

/** Update streak: call when user publishes a post this week. */
export function updateStreak() {
  try {
    const currentWeek = getISOWeek(new Date());
    const raw = localStorage.getItem(LS_STREAK);
    const existing: StreakData = raw ? JSON.parse(raw) : { count: 0, lastWeek: '' };

    if (existing.lastWeek === currentWeek) {
      // Already recorded this week
      return;
    }

    const prevWeek = getPrevISOWeek(currentWeek);
    if (existing.lastWeek === prevWeek) {
      // Consecutive week — increment
      existing.count += 1;
    } else {
      // Gap — reset to 1
      existing.count = 1;
    }
    existing.lastWeek = currentWeek;
    localStorage.setItem(LS_STREAK, JSON.stringify(existing));
  } catch {
    // Storage unavailable
  }
}
