#!/bin/sh
set -e

echo "🚀 Starting TelcoManager App..."

# Run migrations
echo "🛠️  Syncing database schema..."
npx prisma db push

# Optional: Run seed if requested
if [ "$SEED_ON_START" = "true" ]; then
  echo "🌱 Seeding database as requested..."
  node prisma/seed.js
fi

# Start the application
echo "🏁 Starting server..."
exec node dist/index.js
