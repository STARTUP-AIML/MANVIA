# ==============================================================================
# MANVIA Backend — Production Multi-Stage Dockerfile
# Stage 1: Build & Prune
# Stage 2: Hardened Alpine Production Runner
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Install libc compatibility layer if needed for native bindings
RUN apk add --no-cache libc6-compat

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source configuration and files
COPY tsconfig*.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Remove development dependencies for lean production footprint
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create unprivileged system group and user
RUN addgroup --system --gid 1001 manvia && \
    adduser --system --uid 1001 --ingroup manvia manvia

# Copy pruned production dependencies and compiled artifacts from builder
COPY --from=builder --chown=manvia:manvia /app/node_modules ./node_modules
COPY --from=builder --chown=manvia:manvia /app/dist ./dist
COPY --from=builder --chown=manvia:manvia /app/package.json ./package.json

# Run as non-root user for defense-in-depth security
USER manvia

EXPOSE 3000

# Container liveness probe healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Production startup command
CMD ["node", "dist/index.js"]
