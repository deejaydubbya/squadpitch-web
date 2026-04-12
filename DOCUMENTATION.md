# Squadpitch — Product Documentation & User Guide

## What Is Squadpitch?

Squadpitch is an AI-powered social media content studio. It lets businesses generate on-brand social media content, manage drafts through an approval workflow, and publish directly to connected social accounts — all from one workspace.

**Live URLs:**
- Web App: https://squadpitch-web.fly.dev
- API: https://squadpitch-api.fly.dev

---

## Architecture Overview

### Backend (`squadpitch-api`)
- **Runtime:** Node.js + Express 5
- **Database:** PostgreSQL (Fly.io managed)
- **Cache/Queues:** Redis (Upstash)
- **Auth:** Auth0 JWT validation
- **AI Text Generation:** OpenAI (GPT-4o-mini)
- **AI Image Generation:** Fal.ai (Flux)
- **AI Video Generation:** Fal.ai
- **Media Storage:** Cloudinary
- **Hosting:** Fly.io (2 machines, rolling deploy)

### Frontend (`squadpitch-web`)
- **Framework:** Next.js 14 (App Router)
- **Auth:** Auth0 SDK v4 (`@auth0/nextjs-auth0`)
- **State:** TanStack Query (React Query)
- **Styling:** Tailwind CSS (dark theme for app, light theme for public pages)
- **Hosting:** Fly.io (2 machines)

### Data Model (10 core tables)
| Table | Purpose |
|-------|---------|
| `clients` | Business accounts (one per brand) |
| `brand_profiles` | Brand description, industry, audience, competitors |
| `voice_profiles` | Tone rules, banned phrases, CTA preferences, content buckets |
| `media_profiles` | Media generation strategy (brand assets, AI, or hybrid) |
| `channel_settings` | Per-channel config (char limits, emoji, trailing hashtags) |
| `drafts` | Generated content with full lifecycle tracking |
| `channel_connections` | OAuth tokens for connected social accounts |
| `moderation_logs` | Audit trail for draft status changes |
| `media_assets` | Uploaded and AI-generated images/videos |
| `post_metrics` | Engagement metrics for published posts |

---

## User Guide

### 1. Sign Up / Log In

1. Visit https://squadpitch-web.fly.dev
2. Click **Start free** or **Get started**
3. Create an account via Auth0 (email/password or social login)
4. You'll be redirected to the Dashboard

### 2. Create a Client (Brand)

1. From the Dashboard, click **New Client**
2. Enter a name for the business/brand
3. The client card appears on the dashboard — click it to enter the workspace

### 3. Configure Brand Profile

Navigate to the **Brand** tab for your client.

- **Description:** What the business does
- **Industry:** Business sector
- **Target Audience:** Who the content is for
- **Website / Social URLs:** Reference links
- **Offers:** Products or services to promote
- **Competitors:** Brands to differentiate from

All of this context is fed to the AI when generating content.

### 4. Configure Voice Profile

Navigate to the **Voice** tab.

- **Tone:** Overall communication style (e.g., "Professional yet approachable")
- **Do/Don't Rules:** Specific guidelines (e.g., "Do use active voice", "Don't use jargon")
- **Banned Phrases:** Words/phrases the AI must never use
- **CTA Preferences:** Preferred calls-to-action
- **Content Buckets:** Categories of content with templates (e.g., "Market Update", "Property Showcase", "Client Testimonial")

### 5. Configure Media Profile

Navigate to the **Media** tab.

Choose a media strategy:
- **Brand Assets Only:** Only use uploaded images
- **Brand Assets + AI:** Supplement uploads with AI-generated images
- **Full AI:** Generate all visual content with AI

### 6. Configure Channel Settings

Navigate to the **Channels** tab (settings section, not connections).

For each social platform (Instagram, Facebook, TikTok, LinkedIn, X, YouTube):
- **Max Characters:** Platform-specific limit
- **Allow Emoji:** Toggle emoji usage
- **Trailing Hashtags:** Hashtags automatically appended to every post
- **Notes:** Custom instructions for the AI for this specific channel

### 7. Connect Social Accounts

Navigate to the **Channels** tab (connections section).

Supported platforms:
| Platform | Status | Auth Method |
|----------|--------|-------------|
| Instagram | Active | Meta (Facebook Login) — requires FB Page + IG Business account |
| Facebook | Active | Meta (Facebook Login) — requires FB Page |
| TikTok | Active | TikTok OAuth 2.0 |
| LinkedIn | Active | LinkedIn OAuth 2.0 |
| X (Twitter) | Active | OAuth 2.0 with PKCE |
| YouTube | Active | Google OAuth 2.0 |

**To connect:**
1. Click **Connect [Platform]**
2. A popup opens with the platform's authorization page
3. Grant permissions
4. The popup closes and the connection status updates to **CONNECTED**

**Notes:**
- Instagram requires the Facebook account to have a Page linked to an Instagram Business/Creator account
- Meta apps in Development mode only allow users added as testers
- X tokens expire after 2 hours (refresh token handles renewal)
- YouTube tokens expire after 1 hour (refresh token handles renewal)
- LinkedIn tokens expire after ~60 days

### 8. Generate Content

Navigate to the **Generate** tab.

1. Select **Kind**: Post, Caption, Video Script, Hook, CTA, or Carousel
2. Select **Channel**: Instagram, Facebook, TikTok, LinkedIn, X, or YouTube
3. (Optional) Select a **Content Bucket** from your voice profile
4. (Optional) Add **Guidance**: specific instructions for this generation
5. Click **Generate**

The AI uses your brand profile, voice profile, media profile, and channel settings to generate on-brand content. The result appears as a new draft in your queue.

### 9. Manage Drafts (Queue)

Navigate to the **Queue** tab.

Draft lifecycle:
```
DRAFT → PENDING_REVIEW → APPROVED → SCHEDULED → PUBLISHED
                       ↘ REJECTED (with reason)
         Any status → FAILED (on error)
```

**Actions:**
- **Edit:** Modify the body text, hashtags, or CTA inline
- **Submit for Review:** Move from DRAFT to PENDING_REVIEW
- **Approve:** Move to APPROVED (ready for scheduling/publishing)
- **Reject:** Move to REJECTED with a reason (audit logged)
- **Schedule:** Set a publish date/time — the system publishes automatically
- **Publish Now:** Immediately publish to the connected social account
- **Delete:** Remove the draft

### 10. Asset Library

Navigate to the **Assets** tab.

**Upload:**
- Drag and drop or click to browse
- Supports images (JPG, PNG, WebP, GIF) and videos (MP4, max 500MB)
- Add optional alt text and caption

**AI Generate:**
- Describe the image or video you want
- Optionally link to a draft
- Choose Image or Video mode
- Click Generate — the asset appears with a processing indicator

**Manage:**
- Attach assets to drafts
- Detach from drafts
- Copy URL
- Delete

### 11. Calendar

Navigate to the **Calendar** tab.

Visual calendar view of scheduled and published drafts. See what's going out and when.

### 12. Analytics

Navigate to the **Analytics** tab.

- Draft counts by status, kind, and channel
- Approval and rejection rates
- 14-day trend data

---

## OAuth Setup Reference

### Meta (Instagram + Facebook)
- **App ID:** Configured in Meta Developer Dashboard
- **Scopes (Instagram):** `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`
- **Scopes (Facebook):** `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`
- **Redirect URIs:** `/oauth/INSTAGRAM/callback`, `/oauth/FACEBOOK/callback`
- **Env Vars:** `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`

### TikTok
- **Scopes:** `user.info.basic`, `video.publish`
- **Redirect URI:** `/oauth/TIKTOK/callback`
- **Env Vars:** `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`

### LinkedIn
- **Scopes:** `openid`, `profile`, `w_member_social`
- **Redirect URI:** `/oauth/LINKEDIN/callback`
- **Env Vars:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`

### X (Twitter)
- **Scopes:** `tweet.write`, `tweet.read`, `users.read`, `offline.access`
- **Auth:** OAuth 2.0 with PKCE (code verifier stored in Redis)
- **Redirect URI:** `/oauth/X/callback`
- **Env Vars:** `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`

### YouTube (Google)
- **Scopes:** `youtube.upload`, `youtube.readonly`
- **Auth:** Google OAuth 2.0 with offline access (refresh token)
- **Redirect URI:** `/oauth/YOUTUBE/callback`
- **Env Vars:** `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`

---

## Environment Variables

### squadpitch-api
| Variable | Purpose |
|----------|---------|
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Auth0 API audience identifier |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ALLOWED_ORIGINS` | CORS allowed origins |
| `OPENAI_API_KEY` | OpenAI API key for content generation |
| `OPENAI_DEFAULT_MODEL` | Model to use (default: gpt-4o-mini) |
| `FAL_API_KEY` | Fal.ai key for image/video generation |
| `FAL_DEFAULT_MODEL` | Fal model (default: fal-ai/flux/dev) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `OAUTH_STATE_SECRET` | HMAC secret for OAuth state signing |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM key for encrypting stored tokens |
| `META_APP_ID` | Meta/Facebook App ID |
| `META_APP_SECRET` | Meta/Facebook App Secret |
| `META_OAUTH_REDIRECT_URI` | Base redirect URI for Meta OAuth |
| `TIKTOK_CLIENT_KEY` | TikTok client key |
| `TIKTOK_CLIENT_SECRET` | TikTok client secret |
| `TIKTOK_REDIRECT_URI` | TikTok OAuth redirect URI |
| `LINKEDIN_CLIENT_ID` | LinkedIn client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn client secret |
| `LINKEDIN_REDIRECT_URI` | LinkedIn OAuth redirect URI |
| `X_CLIENT_ID` | X (Twitter) client ID |
| `X_CLIENT_SECRET` | X (Twitter) client secret |
| `X_REDIRECT_URI` | X OAuth redirect URI |
| `YOUTUBE_CLIENT_ID` | Google/YouTube client ID |
| `YOUTUBE_CLIENT_SECRET` | Google/YouTube client secret |
| `YOUTUBE_REDIRECT_URI` | YouTube OAuth redirect URI |

### squadpitch-web
| Variable | Purpose |
|----------|---------|
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Auth0 API audience |
| `AUTH0_CLIENT_ID` | Auth0 web app client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 web app client secret |
| `AUTH0_ISSUER_BASE_URL` | Auth0 issuer URL |
| `AUTH0_SECRET` | Session encryption secret |
| `AUTH0_BASE_URL` | App base URL |
| `APP_BASE_URL` | App base URL (used for redirects) |
| `SQUADPITCH_API_URL` | Backend API URL |

---

## Infrastructure

| Service | Provider | Details |
|---------|----------|---------|
| API Hosting | Fly.io | `squadpitch-api` app, 2 machines |
| Web Hosting | Fly.io | `squadpitch-web` app, 2 machines |
| Database | Fly.io Postgres | `squadpitch-db`, shared-cpu-1x |
| Cache/Queues | Upstash Redis | `squadpitch-redis` |
| Auth | Auth0 | `dev-lydwxmh7hokvbp8b` tenant |
| Media Storage | Cloudinary | Image/video upload and transformation |
| AI Text | OpenAI | GPT-4o-mini for content generation |
| AI Image/Video | Fal.ai | Flux for images, video generation |

---

## Publishing Flow (Technical)

1. User clicks **Publish** or scheduled time arrives
2. `publishingService.js` loads the draft + channel connection
3. Connection token is decrypted (`tokenCrypto.js` AES-256-GCM)
4. Channel adapter (`instagram.adapter.js`, etc.) builds the platform-specific payload
5. Adapter calls the platform API to create the post
6. On success: draft status → `PUBLISHED`, external post URL saved
7. On failure: draft status → `FAILED`, error classified as transient/permanent/connection
8. Transient failures are retried by the scheduled publish worker

---

## Background Workers

| Worker | Purpose |
|--------|---------|
| `mediaGenWorker.js` | Processes AI image generation jobs via BullMQ |
| `videoGenWorker.js` | Processes AI video generation jobs via BullMQ |
| `scheduledPublishWorker.js` | Publishes scheduled drafts when their time arrives |
