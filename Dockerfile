ARG ALPINE_VERSION=3.24

FROM node:24-alpine${ALPINE_VERSION} AS dependencies

ENV NODE_ENV=production \
    PYTHON=/usr/bin/python3 \
    npm_config_nodedir=/usr/local

WORKDIR /build

COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps g++ make python3 \
    && npm ci --omit=dev \
    && npm cache clean --force \
    && apk del .build-deps

FROM alpine:${ALPINE_VERSION} AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    INVENTORY_CONFIG_FILE=/app/config/inventory.yaml \
    NOVNC_PUBLIC_DIR=/usr/share/novnc \
    HOME=/tmp/scope

WORKDIR /app

RUN apk add --no-cache \
      freerdp \
      libstdc++ \
      novnc \
      openssh-client \
      sshpass \
      websockify \
      x11vnc \
      xvfb \
    && addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node

COPY --from=dependencies /usr/local/bin/node /usr/local/bin/node
COPY --from=dependencies --chown=node:node /build/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node config ./config

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/readyz || exit 1

CMD ["node", "src/server.mjs"]
