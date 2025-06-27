# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app

EXPOSE 80

FROM base AS builder

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

USER node

COPY . .

CMD ["npm", "run", "build"]

# DevContainer
# https://stackoverflow.com/a/78621662/5587393
FROM base AS devcontainer

ARG REMOTE_USER
ARG REMOTE_UID
ARG REMOTE_GID
RUN <<EOF
    addgroup --gid ${REMOTE_GID} ${REMOTE_USER}
    adduser --disabled-password --uid ${REMOTE_UID} --gid ${REMOTE_GID} ${REMOTE_USER}
EOF

ENV HOME=/home/${REMOTE_USER}
# HEALTHCHECK NONE

USER ${REMOTE_USER}

FROM base AS prod

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

USER node

COPY --from=builder /usr/src/app/dist ./dist

CMD ["npm", "run", "start"]