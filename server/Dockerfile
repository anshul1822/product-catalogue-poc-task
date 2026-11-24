# Catalogue API image. Build context: server/
#   docker build -t catalogue-server ./server
#   docker run --rm -p 3000:3000 catalogue-server

# ---- build: compile TypeScript with dev dependencies ----
FROM node:22-alpine AS build
WORKDIR /app

# Install from the lockfile first, so this layer is cached until dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ---- runtime: production dependencies and compiled JavaScript only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# The node image ships an unprivileged "node" user; never run as root.
USER node

EXPOSE 3000

# Liveness only: /api/health does not call Fake Store.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Run node directly (not npm) so SIGTERM from `docker stop` reaches the app's shutdown handler.
CMD ["node", "dist/src/main.js"]
