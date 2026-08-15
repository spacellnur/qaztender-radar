FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm pm2

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["pm2-runtime", "ecosystem.config.cjs"]
