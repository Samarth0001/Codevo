# Runner Dockerfile for Node.js template
FROM node:18-slim

# Install build dependencies for node-pty
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Set environment variables for node-gyp
ENV PYTHON=/usr/bin/python3
ENV NODE_GYP_FORCE_PYTHON=/usr/bin/python3
ENV NPM_CONFIG_PYTHON=/usr/bin/python3

# Note: Environment variables above handle Python configuration

WORKDIR /app

COPY package.json package-lock.json ./
RUN NODE_ENV=development npm install --build-from-source --verbose

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"] 