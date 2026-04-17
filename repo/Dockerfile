# Build context must be the repository root (directory that contains `src/`).
# Example: docker build -f Dockerfile .

FROM node:20-alpine AS builder

WORKDIR /app

COPY src/package*.json ./
RUN npm ci --ignore-scripts

COPY src/ ./
RUN npm run build

FROM node:20-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY src/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN mkdir -p /data/files && chown -R appuser:appgroup /data/files
RUN chmod 750 /data/files

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
