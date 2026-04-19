# Analytics UX Refactor Notes

## What Was Confusing in the Old Design

1. **Mixed metric types**: Real platform metrics (reach, impressions), derived metrics (engagement rate), and AI-generated scores (quality score, composite score) were presented side-by-side with identical styling, making it impossible to tell what was measured vs inferred.

2. **Single long page**: 9 sections (Distribution, Engagement, Content Intelligence, Coverage & Trust, Conversions, Campaigns, Autopilot, Business Data, Benchmarks) stacked vertically created an overwhelming experience. Users didn't know where to look first.

3. **Ambiguous labels**: "Top Platform", "Best Content Type", "Campaign Score", and "Observed Performance" didn't specify *by what metric*. A user couldn't tell if "Top Platform" meant by reach, engagement, volume, or score.

4. **Engagement rate looked broken**: 213%+ engagement rates (mathematically valid when saves/shares exceed impressions) looked like a bug, undermining trust in all analytics.

5. **Dead empty states**: "No conversions tracked yet" and "No autopilot data yet" felt broken rather than helpful — no guidance on what to do.

6. **Coverage & Trust was buried**: The most trust-building section was section 4 of 9, easily scrolled past.

## What Changed

### Information Architecture: 4 Tabs

| Tab | Purpose | Key Content |
|-----|---------|-------------|
| **Overview** | "How are things going?" | Key KPIs, top/worst posts, publishing trend, coverage summary |
| **Performance** | Measured social performance | Distribution, Engagement, Campaign Performance, Conversions |
| **Intelligence** | AI analysis & patterns | Content analysis, Autopilot performance, Business data performance |
| **System & Health** | Trust, coverage, setup | Coverage & Trust, Benchmarks, Setup status cards |

### Label Clarity

| Before | After |
|--------|-------|
| Top Platform | Top Platform by Reach / Top Platform by Score |
| Best Content Type | Best Content Type (by avg engagement score) |
| Observed Performance | Observed Performance Score (with tooltip explaining derivation) |
| Campaign Score | Avg Campaign Performance (composite score 0–100) |
| Quality Score | Quality Score (Internal) |
| Avg Engagement Rate | Avg Engagement Rate (with tooltip + extreme value handling) |

### Engagement Rate Handling

- Rates > 50% get helper text: "High rate — may include repeat engagements"
- All engagement rate cards include a tooltip explaining the formula and why rates > 100% can occur
- Display format shows 1 decimal for extreme values, 2 decimals for normal ranges

### Empty States → Setup-Oriented

Every empty section now includes:
- Clear explanation of what the section unlocks
- A setup CTA button linking to the right settings/configuration page
- Optional hint text explaining what will appear once data is available

Examples:
- Conversions: "Create a trackable link" → links page
- Autopilot: "Configure Autopilot" → settings page + explanation that you review before publish
- Business Data: "Import business data" → business data page

### Setup Status Cards (System & Health tab)

New diagnostic section showing at-a-glance setup completion for:
- Channel Connections (green dot if connected, count of connections)
- Autopilot (configured / not configured, draft count)
- Conversion Tracking (active / not set up, conversion count)
- Business Data (imported / not imported, item count)

Each card has a direct link to configure the feature.

## How Metric Classes Are Separated

### Visual Treatment

| Class | Badge | Value Color | Examples |
|-------|-------|-------------|----------|
| **Measured** | Blue badge "Measured" | `text-blue-400` | Impressions, Reach, Engagement Rate, Conversions |
| **Derived** | Amber badge "Derived" | `text-amber-400` | Benchmarks (calculated from your data) |
| **AI / Internal** | Purple badge "AI Analysis" | `text-purple-400` | Quality Score, Composite Score, Content Intelligence |

### Naming Convention

- Measured metrics: No qualifier needed (Impressions, Reach, Total Conversions)
- Derived metrics: Include basis ("Observed Performance Score", "Avg Campaign Performance")
- AI metrics: Marked "(Internal)" — e.g., "Quality Score (Internal)"

### Tooltips

Key metrics that could be misunderstood have `HelpCircle` tooltip icons with explanatory text:
- Engagement Rate: formula + why > 100% is possible
- Observed Performance Score: what it's derived from
- Quality Score: that it's AI-generated, not from platform APIs
- Campaign Performance: that it blends engagement with quality
- Approval Rate: what it measures for autopilot

### Intelligence Tab Disclaimer

A prominent purple notice at the top of the Intelligence tab:
> "Content Intelligence uses AI analysis and pattern detection. Metrics labeled 'Internal' are not from platform APIs..."

## Files Changed

### Frontend (squadpitch-web)

| File | Change |
|------|--------|
| `src/app/(app)/workspaces/[clientId]/analytics/page.tsx` | **Rewritten** — 4-tab architecture, all label/tooltip/empty-state improvements |
| `src/components/studio/analytics/AnalyticsSection.tsx` | Added "Derived" badge type, `emptyAction` CTA button, `emptyHint` text |
| `src/components/studio/analytics/MetricCard.tsx` | Added `tooltip` prop with hover tooltip, `sampleSize` indicator, `amber` variant |

### Backend (squadpitch-api)

| File | Change |
|------|--------|
| `scripts/seed-autopilot.js` | **New** — Seeds 25 autopilot drafts with proper metadata for analytics |
| `domains/studio/recommendationEngine.service.js` | Bug fix — suppress campaign recs when any campaign exists |

### No Backend API Changes Required

The existing `/analytics/overview` endpoint already returns all the data needed for the new tab structure. The refactor is purely a frontend reorganization and presentation improvement. All section data (`sections.distribution`, `sections.engagement`, `sections.contentIntelligence`, etc.) maps directly to the new tab layout.

## What Still Needs Future Work

1. **Engagement rate normalization**: Consider adding a "normalized" engagement rate alongside the raw rate that caps at 100% or uses a different formula (engagements/reach instead of engagements/impressions).

2. **Sample size badges**: The `MetricCard` now supports a `sampleSize` prop that shows a warning when < 10 posts. This should be wired up once the backend adds sample size metadata to more section responses.

3. **Confidence indicators for benchmarks**: Currently benchmarks show sample size but don't grade confidence (e.g., "high confidence — 50+ posts" vs "low confidence — 5 posts"). The `BenchmarkSummary` component could benefit from this.

4. **Hook/CTA/timing analysis in Intelligence tab**: The plan mentions expanding Intelligence with hook type performance, CTA effectiveness, and best posting times. The backend already tracks `hookType` and `postingTimeBucket` in `PostInsight` — this data just needs frontend charts.

5. **Campaign vs non-campaign comparison**: The plan mentions comparing campaign content performance against non-campaign content. This would require a new backend calculation.

6. **Mobile responsiveness**: The tab bar works but could benefit from a horizontal scroll or dropdown on very narrow screens.
