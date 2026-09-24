# ==========================================
# Green Deck CRM - Production Dockerfile for Coolify
# Multi-stage optimized Node.js container
# ==========================================

# --- Stage 1: Build Frontend Assets ---
FROM node:20-alpine AS builder

WORKDIR /app

# Add dependencies for potential native builds
RUN apk add --no-cache libc6-compat

# Copy package descriptors
COPY package*.json ./

# Install dependencies (robust for any git branch / cache state)
RUN npm install --legacy-peer-deps

# Copy project source files
COPY . .

# Build the client SPA into /dist
RUN npm run build

# Prune devDependencies to keep only production packages
RUN npm prune --omit=dev

# --- Stage 2: Production Execution Image ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl & wget for healthchecks
RUN apk add --no-cache wget curl

# Non-root user for security compliance
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 crmuser

# Copy pruned production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy built static assets from builder
COPY --from=builder /app/dist ./dist

# Copy backend server and schemas
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/directus-schema.json ./directus-schema.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Assign ownership to non-root user
RUN chown -R crmuser:nodejs /app

USER crmuser

EXPOSE 3000

# Coolify / Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Start production server
CMD ["npm", "start"]
