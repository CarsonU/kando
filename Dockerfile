# syntax=docker/dockerfile:1

# ---- Build stage: compile TypeScript and bundle with Vite ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies against the lockfile for a reproducible build.
COPY package.json package-lock.json ./
RUN npm ci

# Build the static site into /app/dist.
COPY . .
RUN npm run build

# ---- Runtime stage: serve the static bundle with nginx ----
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
