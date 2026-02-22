# Use the official Bun image
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Runner stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy the built assets from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
# Copy node_modules for externalized dependencies (kuromoji, kuroshiro)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000/health').then(r => { if (r.status !== 200) throw new Error(r.status); process.exit(0) }).catch(e => { console.error(e); process.exit(1) })"

CMD ["bun", "run", "./build/index.js"]
