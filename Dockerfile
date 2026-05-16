# Build Stage
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages/ ./packages/
COPY plugins/ ./plugins/
RUN npm install

# Copy source
COPY . .

# Build the app (non-standalone for simplicity in this demo, but standalone is better for prod)
# We will use standalone for the final version as requested.
ENV NODE_ENV=production
RUN npm run build

# Production Stage
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/plugins ./plugins
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "server.js"]
