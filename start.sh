#!/bin/sh
set -e

echo "🚀 Starting TelcoManager App..."

# Optional, opt-in only: manual schema recovery (NOT run by default)
if [ "$RUN_SCHEMA_RECOVERY" = "true" ]; then
  echo "⚙️  RUN_SCHEMA_RECOVERY=true → running manual schema recovery..."
  node prisma/scripts/fix-enums.js
fi

# Run migrations to ensure schema is fully updated and tracked
echo "🛠️  Applying database migrations..."
npx prisma migrate deploy

# Always run seed (idempotent: create if missing, reset if SEED_ON_START=true)
echo "🌱 Checking database state..."
node prisma/seed.js

# Start the application
echo "🏁 Starting server..."
exec node dist/index.js
