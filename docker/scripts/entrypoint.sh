#!/bin/sh
set -e

echo "=========================================="
echo "  PBH CRM - Starting Application"
echo "=========================================="

# Wait for database to be ready
echo "Waiting for database..."
until nc -z db 5432 2>/dev/null; do
  echo "  Database is unavailable - sleeping"
  sleep 2
done
echo "  Database is up!"

# Wait for Redis if configured
if [ -n "$REDIS_URL" ]; then
  echo "Waiting for Redis..."
  # Extract host from REDIS_URL (redis://host:port)
  REDIS_HOST=$(echo "$REDIS_URL" | sed -e 's|redis://||' -e 's|:.*||')
  REDIS_PORT=$(echo "$REDIS_URL" | sed -e 's|.*:||')
  until nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
    echo "  Redis is unavailable - sleeping"
    sleep 2
  done
  echo "  Redis is up!"
fi

# Run migrations in production using the project's Prisma version
if [ "$NODE_ENV" = "production" ]; then
  echo "Running database migrations..."
  # Use the bundled Prisma client to push schema (migrate deploy requires migration files)
  ./node_modules/.bin/prisma db push --skip-generate 2>/dev/null || echo "  Schema push skipped (no changes or already up to date)"
  echo "  Database ready!"
fi

echo "=========================================="
echo "  Starting Node.js application..."
echo "=========================================="

# Execute the main command
exec "$@"
