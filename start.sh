#!/bin/sh
set -e

echo "🚀 Starting TelcoManager App..."

# Run migrations
echo "🛠️  Syncing database schema..."
npx prisma migrate deploy || {
  echo "⚠️  Migrate deploy failed. Database might already be populated. Resolving baseline migration..."
  npx prisma migrate resolve --applied 20260526153000_init_schema
  echo "⚙️  Executing missing enum types and columns patch..."
  node prisma/fix-enums.js
  echo "🔄 Retrying migrate deploy..."
  npx prisma migrate deploy
}

# Always run seed (idempotent: create if missing, reset if SEED_ON_START=true)
echo "🌱 Checking database state..."
node prisma/seed.js

# Start the application
echo "🏁 Starting server..."
exec node dist/index.js
