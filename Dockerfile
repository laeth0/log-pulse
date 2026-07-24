FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(response => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
