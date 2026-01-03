FROM node:20-bookworm AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
# We use the Playwright image or install deps manually. 
# Using the official Playwright image for the runner ensures all browser deps are present.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install nodejs in the playwright image (it has node but might be different version, usually it comes with node though)
# The mcr.microsoft.com/playwright image usually comes with Node.js. 
# We should check the version or just rely on it. v1.49 usually has Node 20 or 22.

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# We also need to copy the package.json/lock if we need to run any npm scripts, 
# but for standalone we mostly just need the build output.
# However, Playwright driver needs to be available. 
# The standalone build includes node_modules for production.
# But we need to make sure the browsers are installed.
# The base image `mcr.microsoft.com/playwright` HAS the browsers installed.
# So we just need to make sure the `playwright` package in node_modules can find them.

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
