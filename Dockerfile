# =====================================================================
# Stage 1: Build Frontend Assets
# =====================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies deterministically
RUN pnpm install --frozen-lockfile || npm ci

# Copy application source code
COPY . .

# Build production bundle with Vite
RUN npm run build

# =====================================================================
# Stage 2: Production Web Server (Lightweight, Secure Nginx)
# =====================================================================
FROM nginx:1.27-alpine-slim AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom hardened nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

# Launch nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
