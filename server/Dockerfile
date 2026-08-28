# syntax=docker/dockerfile:1

# Dependency-free Node service — no npm install needed.
FROM node:22-alpine
WORKDIR /app

COPY package.json ./
COPY index.mjs ./

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

EXPOSE 3001
VOLUME ["/data"]
CMD ["node", "index.mjs"]
