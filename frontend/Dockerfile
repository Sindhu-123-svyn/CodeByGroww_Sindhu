# Build stage — VITE_API_BASE_URL is baked in at build time (it's read by
# the browser, not the container, so it must point at whatever host/port
# the backend is actually published on — set via docker-compose.yml build args).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Runtime stage — static files served by nginx, with SPA fallback routing
# (react-router's client-side routes need every path to resolve to index.html).
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
