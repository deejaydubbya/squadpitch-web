# Autopilot Control Center

Dedicated control center for Squadpitch's automated content generation system.

## Information Architecture

```
/workspaces/:id/autopilot
├── Header — status badge, current mode
├── Mode Selector — OFF / DRAFT_ONLY / SCHEDULE_APPROVED / AUTO_PUBLISH
├── Readiness Checklist — prerequisite checks with fix links
├── Channel Permissions — per-channel toggle
├── Content Sources — listing, testimonial, milestone, fallback toggles
├── Safety Rules — rate limits, approval requirements, quiet hours
└── Recent Activity — autopilot draft history feed
```

Dashboard integration via `AutopilotStatusCard` (mode, weekly count, last action, setup warnings).

## Mode Definitions

| Mode | Behavior | Risk Level |
|------|----------|------------|
| `off` | Autopilot disabled | None |
| `draft_only` | Generates drafts for review, no auto-publish | Low |
| `schedule_approved` | Generates + schedules drafts, requires review | Medium |
| `auto_publish` | Full automation (gated, not yet unlocked) | High |

Backward compatibility: old `draft_assist` mode maps to `draft_only`.

## Readiness Rules

Autopilot requires all checks to pass before enabling modes beyond `draft_only`:

1. **Channels** — At least 1 connected publishing channel
2. **Data** — Business data available (non-archived data items)
3. **Brand** — Brand profile configured

## User Controls

### Safety Rules
- `maxDraftsPerDay` — Hard daily limit (default: 2)
- `maxDraftsPerWeek` — Hard weekly limit (default: 3)
- `maxDraftsPerScheduledRun` — Per-run batch limit (default: 2)
- `minimumHoursBetweenDrafts` — Spacing between autopilot drafts (default: 24h)
- `requireApprovalBeforePublish` — Manual approval gate (default: true)
- `quietHoursStart` / `quietHoursEnd` — UTC quiet period (default: none)
- `skipChannelsWithoutMedia` — Skip image-required channels (default: true)

### Content Source Permissions
- `allowListingPosts` — Property listing posts
- `allowTestimonialPosts` — Review/testimonial posts
- `allowMilestonePosts` — "Just Sold" / milestone posts
- `allowFallbackPosts` — Market insights and general posts

## Activity Data Sources

Activity feed queries drafts with `createdBy: "system:autopilot"` or `"system:auto_generate"`.
Metadata parsed from the `warnings` array (prefixed with `autopilot_*`).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/:id/autopilot/settings` | Current settings |
| PUT | `/workspaces/:id/autopilot/settings` | Update settings |
| GET | `/workspaces/:id/autopilot/status` | Dashboard status |
| GET | `/workspaces/:id/autopilot/readiness` | Readiness checklist |
| GET | `/workspaces/:id/autopilot/activity` | Recent activity feed |
| POST | `/workspaces/:id/autopilot/run` | Manual trigger |
| POST | `/workspaces/:id/autopilot/scheduled-run` | Scheduled batch |

## Future Enhancements

- Unlock `auto_publish` mode with additional safety gates
- Per-channel mode overrides
- Autopilot performance analytics (score comparison vs manual)
- Custom content angle preferences
- Autopilot schedule configuration (preferred days/times)
