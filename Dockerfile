# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app
RUN chown node:node .

EXPOSE 80

# ******************************************

FROM base AS devcontainer

RUN apk add --no-cache make

USER node

# ******************************************

FROM base AS builder

USER node

RUN --mount=type=bind,source=app/package.json,target=/usr/src/app/package.json \
    --mount=type=bind,source=app/package-lock.json,target=/usr/src/app/package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

COPY ./app ./

CMD ["npm", "run", "build"]

# ******************************************

FROM base AS prod

USER node

RUN --mount=type=bind,source=app/package.json,target=/usr/src/app/package.json \
    --mount=type=bind,source=app/package-lock.json,target=/usr/src/app/package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

CMD ["npm", "run", "start"]