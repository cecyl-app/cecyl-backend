# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim AS base

WORKDIR /usr/src/app

ENV NODE_ENV=production

ENV OPENAI_API_KEY=
ENV OPENAI_MODEL=gpt-4o-mini

ENV DB_CONN_STRING=mongodb://mongouser:password@db:27017/cecyldb?authSource=admin
ENV MONGO_INITDB_ROOT_USERNAME=mongouser
ENV MONGO_INITDB_ROOT_PASSWORD=password
ENV MONGO_INITDB_DATABASE=cecyldb

ENV GOOGLE_AUTH_ALLOWED_EMAILS=
ENV GOOGLE_AUTH_CLIENT_ID=

EXPOSE 80

RUN <<EOF
    mkdir -p /var/lib/cecyl/data
    chown -R node:node . /var/lib/cecyl/data
EOF

VOLUME ["/var/lib/cecyl/data"]

# ******************************************

FROM base AS devcontainer

RUN apt update && apt install -y make

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