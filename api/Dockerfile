FROM docker.io/oven/bun:alpine
WORKDIR /app
COPY package.json bun.lock ./
COPY node_modules/ ./node_modules/
COPY src/ ./src/
USER bun
CMD ["bun", "src/index.ts"]
