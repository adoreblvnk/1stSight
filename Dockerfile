# Next.js Docker deployment: https://nextjs.org/docs/app/getting-started/deploying#docker
FROM node:24.11.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Next.js Docker deployment: https://nextjs.org/docs/app/getting-started/deploying#docker
FROM node:24.11.1-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Next.js Docker deployment: https://nextjs.org/docs/app/getting-started/deploying#docker
FROM node:24.11.1-alpine AS runner
WORKDIR /app
# Alpine package install: https://wiki.alpinelinux.org/wiki/Alpine_Package_Keeper
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 8080
CMD ["node", "server.js"]
