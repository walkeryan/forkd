#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting TasteLog..."
exec node server.js
