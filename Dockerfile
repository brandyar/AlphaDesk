# ========================================================
# AlphaDesk CRM - Production Dockerfile for Coolify
# Multi-stage optimized build for Node.js / Express / Vite
# ========================================================

# --- Stage 1: Build Frontend Assets ---
FROM node:20-alpine AS builder

WORKDIR /app

# Ensure dev dependencies (like vite, typescript) are installed even if build environment sets NODE_ENV=production
ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy package descriptors
COPY package*.json ./

# Cleanly install all dependencies (including devDependencies required for Vite build)
RUN npm install --include=dev --no-audit --no-fund --legacy-peer-deps

# Copy all project source code
COPY . .

# Compile client React SPA to /dist using vite
RUN npm run build

# --- Stage 2: Production Execution Image ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy package descriptors and install production runtime dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps

# Copy compiled frontend assets & backend server files
COPY --from=builder /app/dist ./dist
COPY server.ts ./server.ts
COPY server ./server
COPY directus-schema.json ./directus-schema.json
COPY tsconfig.json ./tsconfig.json
COPY index.html ./index.html

# Fix file permissions for non-root 'node' user
RUN chown -R node:node /app

# Use built-in unprivileged user for security
USER node

EXPOSE 3000

# Self-contained healthcheck using Node.js built-in fetch with dynamic port resolution
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "const port = process.env.PORT || 3000; fetch('http://127.0.0.1:' + port + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start production server
CMD ["npm", "start"]
