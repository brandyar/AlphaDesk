# ========================================================
# AlphaDesk CRM - Production Dockerfile for Coolify
# Fully offline OS build (No apk/apt network calls needed)
# ========================================================

# --- Stage 1: Build Frontend Assets ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install npm dependencies (using npm registry, robust for all environments)
RUN npm install --legacy-peer-deps

# Copy all project source code
COPY . .

# Compile client React SPA to /dist
RUN npm run build

# Prune devDependencies to keep only production packages
RUN npm prune --omit=dev

# --- Stage 2: Production Execution Image ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy application assets with ownership set to built-in 'node' user
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server.ts ./server.ts
COPY --from=builder --chown=node:node /app/directus-schema.json ./directus-schema.json
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json

# Use built-in unprivileged user for security
USER node

EXPOSE 3000

# Self-contained healthcheck using Node.js built-in fetch (zero system dependencies required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start production server
CMD ["npm", "start"]
