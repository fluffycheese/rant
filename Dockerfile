# ── Stage 1: build React client ───────────────────────────────────────────────
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build          # outputs to /app/dist/public

# ── Stage 2: compile TypeScript server ────────────────────────────────────────
FROM node:22-alpine AS server-builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
COPY tsconfig.json drizzle.config.ts ./
COPY drizzle/ ./drizzle/
RUN npm run build:server

# ── Stage 3: production node_modules (native recompile in clean env) ──────────
FROM node:22-alpine AS prod-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 4: minimal runtime image ───────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=prod-deps    /app/node_modules ./node_modules
COPY --from=server-builder /app/dist       ./dist
COPY --from=server-builder /app/drizzle    ./drizzle
COPY --from=client-builder /app/dist/public ./dist/public

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/ncm.db
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/api/profiles || exit 1

CMD ["node", "dist/entry.node.js"]
