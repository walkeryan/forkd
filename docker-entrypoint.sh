#!/bin/sh

# Persist startup diagnostics to the uploads volume so they survive a crash
# and can be read from the Unraid file browser at:
#   Main → Shares → appdata/forkd/forkd-uploads/startup.log
LOG=/app/uploads/startup.log
: > "$LOG"

# tlog: write one line to both stdout (Docker logs) and the persistent file
tlog() {
  echo "$*"
  echo "$*" >> "$LOG"
}

# ── DATABASE_URL construction ──────────────────────────────────────────────────
# Production POSTGRES_PASSWORD is a base64 string that almost certainly contains
# '/' or '+'. Embedding it raw into a URL breaks URL parsing (e.g. the path
# separator '/' splits the password from the host). We use Node's
# encodeURIComponent to percent-encode any URL-unsafe characters before
# assembling the connection string.
if [ -n "$POSTGRES_PASSWORD" ]; then
  _enc=$(node -e "process.stdout.write(encodeURIComponent(process.env.POSTGRES_PASSWORD))" 2>/dev/null)
  export DATABASE_URL="postgresql://tastelog:${_enc}@forkd-db:5432/tastelog"
  unset _enc
fi
# ──────────────────────────────────────────────────────────────────────────────

tlog "=== Fork'd Startup $(date) ==="
tlog "NODE_ENV=$NODE_ENV  PORT=$PORT"
tlog "NEXTAUTH_URL=$NEXTAUTH_URL"
tlog "DATABASE_URL_SET=$([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
tlog "NEXTAUTH_SECRET_SET=$([ -n "$NEXTAUTH_SECRET" ] && echo YES || echo NO)"
tlog "AUTH_GOOGLE_ID_SET=$([ -n "$AUTH_GOOGLE_ID" ] && echo YES || echo NO)"
tlog ""
tlog "--- Prisma engine files in .prisma/client/ ---"
ls_out=$(ls /app/node_modules/.prisma/client/ 2>&1)
tlog "$ls_out"
tlog ""
tlog "--- Running database migrations ---"
migrate_out=$(node ./node_modules/prisma/build/index.js migrate deploy 2>&1)
MIGRATE_EXIT=$?
tlog "$migrate_out"
tlog "--- Migration exit code: $MIGRATE_EXIT ---"

if [ "$MIGRATE_EXIT" -ne 0 ]; then
  tlog "FATAL: Migration failed. Diagnostics saved to $LOG"
  exit 1
fi

tlog "--- Starting Fork'd server ---"
exec node server.js
