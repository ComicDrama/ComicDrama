FROM mirror.gcr.io/library/node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY web web
COPY packages/contracts packages/contracts
RUN npm run build --workspace web

FROM nginx:1.27-alpine
COPY --from=build /app/web/dist /usr/share/nginx/html
