FROM node:20-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* values are inlined at build time. Fly's runtime
# secrets aren't available to `next build`, so we pipe the demo
# flag through a Docker build ARG. Default off; set to "true" via
# fly.toml [build.args] (or `fly deploy --build-arg`) when serving
# the Meta App Review demo workspace.
ARG NEXT_PUBLIC_META_APP_REVIEW_DEMO
ENV NEXT_PUBLIC_META_APP_REVIEW_DEMO=$NEXT_PUBLIC_META_APP_REVIEW_DEMO
ARG NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED
ENV NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED=$NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED

RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
