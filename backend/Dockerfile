# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk update && apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci
RUN npx prisma generate

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Compile the seed script separately (it's outside rootDir)
RUN npx tsc prisma/seed.ts --outDir prisma --esModuleInterop --skipLibCheck --module commonjs --target ES2020

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma in production
RUN apk update && apk add --no-cache openssl libc6-compat netcat-openbsd

# Copy built artifacts and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose API port
EXPOSE 3001

# Start the application
# Start the application (wait for DB, push schema, run seed, then start)
CMD ["sh", "-c", "echo 'En attente de la base de données...'; while ! nc -z postgres 5432; do sleep 1; done; echo 'Base de données prête !'; npx prisma db push --skip-generate && npx prisma db seed && npm start"]
