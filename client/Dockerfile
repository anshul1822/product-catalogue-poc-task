# Web app image. Build context: client/
#   docker build -t catalogue-client ./client
#   docker run --rm -p 8080:8080 -e API_UPSTREAM=http://<api-host>:3000 catalogue-client

# ---- build: typecheck and bundle the React app ----
FROM node:22-alpine AS build
WORKDIR /app

# Install from the lockfile first, so this layer is cached until dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# ---- runtime: static files served by nginx, running as a non-root user on 8080 ----
FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime

# Where nginx forwards /api. Compose sets it to the server service; override it elsewhere.
ENV API_UPSTREAM=http://server:3000
# DNS server nginx asks for the API's address: Docker's embedded DNS. On AWS ECS
# (awsvpc networking) use the VPC resolver, 169.254.169.253.
ENV NGINX_RESOLVER=127.0.0.11

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Checks nginx serves the app shell; deliberately not /api, so an API outage does not restart this container.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
