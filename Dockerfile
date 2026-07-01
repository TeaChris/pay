# =============================================================================
# Dockerfile — PAY Backend (Multi-stage production build)
# =============================================================================
# Stage 1: Install dependencies
# Stage 2: Build TypeScript
# Stage 3: Production runtime (minimal image)
# =============================================================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# --- Stage 2: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript to dist/
RUN npm run build

# Remove dev dependencies for production
RUN npm prune --production

# --- Stage 3: Production Runtime ---
FROM node:22-alpine AS runner

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 payapp

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy package.json for metadata
COPY --from=builder /app/package.json ./

# Copy Drizzle config and migrations for runtime migration
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/drizzle ./drizzle

# Do NOT copy keys/ — they must be mounted at runtime
# Do NOT copy .env — environment variables should be injected

# Set production defaults
ENV NODE_ENV=production
ENV PORT=8000

# Expose the application port
EXPOSE 8000

# Switch to non-root user
USER payapp

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

# Start the application
CMD ["node", "--env-file=/dev/null", "dist/index.js"]
