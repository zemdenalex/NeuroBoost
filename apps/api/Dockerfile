# apps/api/Dockerfile - Update the builder stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/

# Copy prisma schema BEFORE install
COPY apps/api/prisma ./apps/api/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm prisma:generate

# Runtime stage
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate && \
    apk add --no-cache tini

# Create user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy everything including generated prisma client
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/api ./apps/api

# Create logs directory
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "--filter", "@nb/api", "dev"]