FROM node:24-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
COPY apps/web ./apps/web
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24-bookworm-slim
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build --chown=node:node /workspace ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "apps/web", "--", "--hostname", "0.0.0.0"]
