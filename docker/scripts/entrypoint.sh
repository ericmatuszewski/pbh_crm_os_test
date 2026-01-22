#!/bin/sh
set -e

echo "Starting Sales CRM..."

# Wait for database to be ready
echo "Waiting for database..."
until nc -z db 5432 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "Database is up!"

# Run migrations in production
if [ "$NODE_ENV" = "production" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy
  echo "Migrations complete!"
fi

# Execute the main command
exec "$@"
