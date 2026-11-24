# Catalogue API image. Build context: server/
#   docker build -t catalogue-server ./server
#   docker run --rm -p 3000:3000 catalogue-server

# ---- build: install all dependencies, generate the Prisma client, compile TypeScript ----
# Docker Compose also runs this stage once as the `migrate` service (prisma migrate deploy).
FROM node:22-alpine AS build
WORKDIR /app

# The Prisma schema is needed before `npm ci`: its postinstall script runs `prisma generate`.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
# Regenerate after copying src (src/generated is not part of the build context).
RUN npx prisma generate && npm run build

# ---- runtime: production dependencies and compiled JavaScript only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# --omit=optional: @prisma/client lists the Prisma CLI as an optional peer, so npm would
# otherwise install the CLI and ~130 packages it needs (only for migrations, which run in the
# build stage). The only other optional package is pg-cloudflare, which Node never loads.
# --ignore-scripts: the postinstall needs the CLI; the generated client is already in dist/.
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

# The node image ships an unprivileged "node" user; never run as root.
USER node

EXPOSE 3000

# Liveness only: /api/health does not call Fake Store, the database or the mail server.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Run node directly (not npm) so SIGTERM from `docker stop` reaches the app's shutdown handler.
CMD ["node", "dist/src/main.js"]
