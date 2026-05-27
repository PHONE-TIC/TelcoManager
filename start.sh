#!/bin/sh
set -e

echo "🚀 Starting TelcoManager App..."

# Execute defensive database schema recovery first
echo "⚙️  Executing database schema recovery and enums patch..."
node prisma/fix-enums.js

# Run migrations to ensure schema is fully updated and tracked
echo "🛠️  Syncing database schema..."
npx prisma migrate deploy || {
  echo "⚠️  Migrate deploy failed. Resolving baseline migration..."
  npx prisma migrate resolve --applied 20260526153000_init_schema
  echo "🔄 Retrying migrate deploy..."
  npx prisma migrate deploy
}

# Always run seed (idempotent: create if missing, reset if SEED_ON_START=true)
echo "🌱 Checking database state..."
node prisma/seed.js

# Start the application
echo "🏁 Starting server..."
exec node dist/index.js
