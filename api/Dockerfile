FROM mirror.gcr.io/library/node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY api api
COPY packages/contracts packages/contracts
RUN npm run build --workspace api

FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/api/package.json api/package.json
COPY --from=build /app/web/package.json web/package.json
COPY --from=build /app/packages/contracts/package.json packages/contracts/package.json
RUN npm ci --omit=dev
COPY --from=build /app/api/dist api/dist
EXPOSE 3000
CMD ["node", "api/dist/main.js"]
