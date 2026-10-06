FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN test -f package-lock.json || (echo 'Missing package-lock.json. Generate it on a networked machine before building Avirzo for production.' >&2; exit 1)
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN test -f package-lock.json || (echo 'Missing package-lock.json. Generate it on a networked machine before building Avirzo for production.' >&2; exit 1)
RUN npm ci --omit=dev --workspace=server --no-audit --no-fund

FROM deps AS build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" || (echo 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY at build time' >&2; exit 1)
COPY . .
RUN test -f server/src/index.js && test -f server/src/worker.js && test -f server/src/services/core.js || (echo 'Avirzo server source is missing from the Docker build context. Push the complete server/src directory.' >&2; exit 1)
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates fontconfig fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/supabase.sql ./supabase.sql
RUN mkdir -p /app/projects && chown -R node:node /app
USER node
EXPOSE 10000
CMD ["node", "server/src/index.js"]
