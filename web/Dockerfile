# syntax=docker/dockerfile:1.7

# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install pnpm via corepack
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy only files needed for install first (better layer caching)
COPY package.json ./
# Copy lockfile if present
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY . .

# Build static assets
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm run build

# Runtime stage (nginx to serve built assets)
FROM nginx:alpine AS runtime

# Nginx config for SPA (history fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
