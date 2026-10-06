# ---- build the React client ----
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- run the API, serving the built client ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY thumbs/ ./thumbs/
COPY --from=client /app/client/dist ./client/dist
ENV PORT=8787 DB_PATH=/data/prices.db
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["node", "--no-warnings", "server/src/index.js"]
