# Build stage
FROM node:22-slim AS builder
WORKDIR /app
ENV HUSKY=0
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build

# Runtime stage
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
# husky é devDependency: o script prepare quebraria o npm ci --omit=dev
RUN npm pkg delete scripts.prepare \
  && npm ci --omit=dev \
  && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN mkdir -p data media
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3100/v1/health').then(r=>{if(!r.ok)throw new Error('unhealthy')}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
