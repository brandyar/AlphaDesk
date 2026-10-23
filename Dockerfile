# ========================================================
# AlphaDesk CRM - Production Dockerfile for Coolify
# Multi-stage optimized build for Node.js / Express / Vite
# ========================================================

# --- Stage 1: Build Frontend Assets & Backend Bundle ---
FROM node:20-alpine AS builder

WORKDIR /app

# Ensure dev dependencies are installed for Vite & esbuild
ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:$PATH"

# Install libc6-compat for esbuild compatibility in Alpine
RUN apk add --no-cache libc6-compat

# Copy package descriptors
COPY package*.json ./

# Cleanly install all dependencies (including devDependencies required for Vite & esbuild)
RUN npm install --include=dev --no-audit --no-fund --legacy-peer-deps

# Copy all project source code
COPY . .

# Compile client React SPA to /dist and bundle server to /app/server.js
RUN npm run build

# --- Stage 2: Production Execution Image ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PATH="/app/node_modules/.bin:$PATH"

# Install libc6-compat for system compatibility
RUN apk add --no-cache libc6-compat

# Copy package descriptors and install only production runtime dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps

# Copy compiled frontend assets & pre-bundled backend server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY directus-schema.json ./directus-schema.json
COPY index.html ./index.html

# Fix file permissions for non-root 'node' user
RUN chown -R node:node /app

# Use built-in unprivileged user for security
USER node

EXPOSE 3000

# Reliable HTTP health probe with generous start-period (60s) to prevent premature container restarts
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Direct node execution for PID 1, low memory consumption, and immediate signal handling
CMD ["node", "server.js"]
