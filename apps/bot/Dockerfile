# apps/bot/Dockerfile - Update to include prisma generation
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm install --frozen-lockfile

COPY apps/bot/ ./apps/bot/
COPY apps/api/src ./apps/api/src

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm prisma:generate


# Production stage
FROM node:20-alpine

# Install pnpm and required tools
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate && \
    apk add --no-cache tini tzdata

# Set timezone to Moscow
ENV TZ=Europe/Moscow
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime && \
    echo "Europe/Moscow" > /etc/timezone

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/bot/package.json ./apps/bot/

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/bot/node_modules ./apps/bot/node_modules

# Copy application code
COPY --from=builder /app/apps/bot ./apps/bot

# Create logs directory
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production \
    BOT_PORT=3002 \
    LOGS_DIR=/app/logs \
    TZ=Europe/Moscow

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3002/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Expose port (for health checks)
EXPOSE 3002

# Use tini to handle signals properly
ENTRYPOINT ["tini", "--"]

# Start the bot
CMD ["node", "apps/bot/src/index.mjs"]