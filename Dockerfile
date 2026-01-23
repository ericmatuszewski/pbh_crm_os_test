# syntax=docker/dockerfile:1

# ==================== Dependencies ====================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ==================== Builder ====================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==================== Development ====================
FROM node:20-alpine AS development
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl openssl-dev

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npx prisma generate

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ==================== Production Runner ====================
FROM node:20-alpine AS runner
WORKDIR /app

# Container metadata
LABEL org.opencontainers.image.title="PBH CRM"
LABEL org.opencontainers.image.description="Enterprise-grade Sales CRM"
LABEL org.opencontainers.image.vendor="PBH"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
# - libc6-compat: Required for some Node.js native modules
# - netcat-openbsd: Used by entrypoint.sh for service health checks
# - openssl: Required for Prisma
RUN apk add --no-cache libc6-compat netcat-openbsd openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy ldapjs and its dependencies (not traced by Next.js standalone)
COPY --from=deps /app/node_modules/ldapjs ./node_modules/ldapjs
COPY --from=deps /app/node_modules/@ldapjs ./node_modules/@ldapjs
COPY --from=deps /app/node_modules/abstract-logging ./node_modules/abstract-logging
COPY --from=deps /app/node_modules/assert-plus ./node_modules/assert-plus
COPY --from=deps /app/node_modules/backoff ./node_modules/backoff
COPY --from=deps /app/node_modules/vasync ./node_modules/vasync
COPY --from=deps /app/node_modules/verror ./node_modules/verror
COPY --from=deps /app/node_modules/extsprintf ./node_modules/extsprintf
COPY --from=deps /app/node_modules/core-util-is ./node_modules/core-util-is
COPY --from=deps /app/node_modules/precond ./node_modules/precond

# Copy entrypoint script
COPY docker/scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
