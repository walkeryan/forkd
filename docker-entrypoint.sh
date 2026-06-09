#!/bin/sh

LOG=/app/uploads/startup.log
: > "$LOG"

tlog() {
  echo "$*"
    echo "$*" >> "$LOG"
    }

    DB_SET=NO; [ -n "$DATABASE_URL" ] && DB_SET=YES
    NS_SET=NO; [ -n "$NEXTAUTH_SECRET" ] && NS_SET=YES
    GI_SET=NO; [ -n "$AUTH_GOOGLE_ID" ] && GI_SET=YES

    tlog "=== Fork'd Startup $(date) ==="
    tlog "NODE_ENV=$NODE_ENV PORT=$PORT NEXTAUTH_URL=$NEXTAUTH_URL"
    tlog "DB_SET=$DB_SET NEXTAUTH_SECRET_SET=$NS_SET AUTH_GOOGLE_ID_SET=$GI_SET"
    tlog ""
    tlog "--- Prisma engines in .prisma/client/ ---"
    ls_out=$(ls /app/node_modules/.prisma/client/ 2>&1)
    tlog "$ls_out"
    tlog ""
    tlog "--- Running database migrations ---"
    migrate_out=$(node ./node_modules/prisma/build/index.js migrate deploy 2>&1)
    MIGRATE_EXIT=$?
    tlog "$migrate_out"
    tlog "--- Migration exit: $MIGRATE_EXIT ---"

    if [ "$MIGRATE_EXIT" -ne 0 ]; then
      tlog "FATAL: Migration failed. Check /app/uploads/startup.log"
        exit 1
        fi

        tlog "--- Starting Fork'd ---"
        exec node server.js
