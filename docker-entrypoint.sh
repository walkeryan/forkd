#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting Fork'd..."
exec node server.js
