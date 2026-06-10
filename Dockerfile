# syntax=docker/dockerfile:1

# ---- Stage 1: deps ----
# Install dependencies. We need devDependencies here because `next build`
# (TypeScript, Tailwind, PostCSS, eslint-config-next) requires them. The slim
# runtime is produced later from Next.js standalone output, not from this stage.
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

# ---- Stage 2: builder ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Public Maps key must be baked into the static bundle at build time.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Stage 3: prisma-cli ----
# The Prisma CLI (needed at runtime for `migrate deploy`) has a deep dependency
# tree (@prisma/config -> effect, c12, deepmerge-ts, empathic, and their
# transitive deps). Hand-picking COPY lines from the builder misses these and
# breaks with "Cannot find module 'effect'" at startup. Installing the CLI
# fresh with npm guarantees the full closure, pinned to the app's version.
FROM node:20-alpine AS prisma-cli
WORKDIR /cli
COPY package.json ./
RUN npm install --no-save --omit=dev prisma@"$(node -p "require('./package.json').dependencies.prisma")"

# ---- Stage 4: runner ----
FROM node:20-alpine AS runner
WORKDIR /app
# openssl is required by Prisma's schema engine binary (used by migrate deploy).
# node:20-alpine pulls it as a Node.js dependency, but we pin it explicitly so
# the version is guaranteed and the CLI is available for debugging.
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV PORT=3333
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone server + assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Generated client + engines for the app's runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Self-contained Prisma CLI (with full dependency closure) for `migrate deploy`,
# kept outside /app/node_modules so it can't conflict with the standalone bundle
COPY --from=prisma-cli /cli/node_modules /opt/prisma-cli/node_modules

# Entrypoint runs migrations then boots the server
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Uploads volume must be writable by the non-root user
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3333

ENTRYPOINT ["./docker-entrypoint.sh"]
