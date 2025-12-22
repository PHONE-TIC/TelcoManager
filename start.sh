#!/bin/sh
set -e

echo "🚀 Starting TelcoManager App..."

# Run migrations
echo "🛠️  Syncing database schema..."
npx prisma db push

# Always run seed (idempotent: create if missing, reset if SEED_ON_START=true)
echo "🌱 Checking database state..."
node prisma/seed.js

# Start the application
echo "🏁 Starting server..."
exec node dist/index.js
