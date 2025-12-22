#!/bin/sh
set -e

echo "🚀 Starting TelcoManager App..."

# Run migrations (use push if migrations are missing, or deploy if they exist)
# Using 'db push' here because we don't have a migrations folder in the source
echo "🛠️  Syncing database schema..."
npx prisma db push

# Start the application
echo "🏁 Starting server..."
exec node dist/index.js
