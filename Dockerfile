# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build

# Runtime stage — npm prune no builder evita disparar o hook "prepare: husky"
# (pitfall: npm ci --omit=dev roda prepare e falha com husky not found, exit 127)
FROM node:22-slim AS pruner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
RUN npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
COPY --from=pruner /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN mkdir -p data media
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3100/v1/health').then(r=>{if(!r.ok)throw new Error('unhealthy')}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
