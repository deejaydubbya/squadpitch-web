# Subscription Limits & Quotas

## Tier Definitions

| Limit | FREE | STARTER | PRO | GROWTH | AGENCY |
|-------|------|---------|-----|--------|--------|
| Workspaces | 1 | 3 | 5 | 10 | Unlimited |
| Posts/mo | 10 | 75 | 250 | 600 | 1,200 |
| Images/mo | 5 | 30 | 75 | 200 | 500 |
| Videos/mo | 1 | 3 | 10 | 30 | 100 |
| Total storage | 250 MB | 3 GB | 10 GB | 30 GB | 100 GB |
| Video storage | 100 MB | 1 GB | 4 GB | 12 GB | 40 GB |
| Image generations/mo | 10 | 75 | 300 | 800 | 2,000 |
| Video generations/mo | 1 | 5 | 15 | 40 | 100 |
| Enhancement runs/mo | 5 | 25 | 100 | 250 | 500 |

## Tracked Metrics

### Monthly Counters (reset on 1st of each month)
- **posts** — AI-generated posts (drafts created via generation endpoints)
- **images** — Total image count: uploads + AI generations
- **videos** — Total video count: uploads + AI generations
- **imageGenerations** — AI image generations only (subset of images)
- **videoGenerations** — AI video generations only (subset of videos)
- **enhancementRuns** — Listing enhancement/extraction runs (SAM2 + OpenAI Vision)

### Storage (cumulative, not reset monthly)
- **totalStorageBytes** — Sum of `bytes` across all MediaAsset records for the user's workspaces
- **videoStorageBytes** — Sum of `bytes` for video MediaAsset records only

## Enforcement Points

| Endpoint | Checks |
|----------|--------|
| `POST /workspaces/:id/assets/upload` (image) | `images` limit + total storage |
| `POST /workspaces/:id/assets/upload` (video) | `videos` limit + total storage + video storage |
| `POST /workspaces/:id/assets/upload-from-url` | `images` limit + total storage |
| `POST /assets/generate` | `imageGenerations` + `images` limits + storage (~2MB est.) |
| `POST /assets/generate-video` | `videoGenerations` + `videos` limits + storage (~10MB est.) |
| `POST /workspaces/:id/listing-campaign/extract-image` | `enhancementRuns` limit |
| All post generation endpoints (8 locations) | `posts` limit |
| `POST /workspaces` (client creation) | `workspaces` limit |

## Storage Behavior

- Storage is computed by aggregating `bytes` from all `MediaAsset` records belonging to the user's workspaces
- Assets with `status: FAILED` are excluded from aggregation
- Deleting an asset immediately frees its storage quota
- AI generations use estimated sizes for pre-flight checks (2MB images, 10MB videos)
- Actual storage is tracked via the `bytes` field on the MediaAsset record (set by Cloudinary)

## Warning Thresholds

Usage notifications are triggered at these levels:
- **70%** — `warning` status
- **90%** — `urgent` status
- **100%** — `exceeded` status

These are surfaced via the `USAGE_LIMIT_NEARING` notification event.

## Error Responses

Quota errors return HTTP 402 with structured body:
```json
{
  "error": "USAGE_LIMIT",
  "message": "Monthly image limit reached. Upgrade your plan for more."
}
```

Storage errors:
```json
{
  "error": "STORAGE_LIMIT",
  "message": "Total storage limit reached. Delete unused assets or upgrade your plan."
}
```

## Reset Behavior

- Monthly counters (posts, images, videos, imageGenerations, videoGenerations, enhancementRuns) reset automatically on the 1st of each month via the `periodStart` key on `UsageRecord`
- Storage limits are cumulative and do not reset — users must delete assets to free space
- Workspace limits are checked against current active (non-archived) workspace count

## Remaining Limitations

- Storage estimates for AI generations are approximate; actual sizes may vary
- No per-workspace storage breakdown (quotas are account-level)
- No grace period when a limit is hit mid-operation
- Webhook-driven tier syncing has eventual consistency (a few seconds delay)
