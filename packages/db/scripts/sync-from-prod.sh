#!/bin/bash
set -euo pipefail

# ─── Sync production data → development database ─────────────
#
# Usage:  pnpm --filter @repo/db sync-from-prod
#
# Reads PRODUCTION_DATABASE_URL and DATABASE_URL from root .env
# Uses pg_dump (data-only) so schema stays managed by Prisma.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DUMP_FILE="$SCRIPT_DIR/.dump.pgdata"

# ─── Load env vars from root .env ─────────────────────────────
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

# ─── Validate ─────────────────────────────────────────────────
if [ -z "${PRODUCTION_DATABASE_URL:-}" ]; then
  echo "❌ PRODUCTION_DATABASE_URL is not set."
  echo "   Add it to $ROOT_DIR/.env"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set."
  exit 1
fi

# Safety: don't sync to production
if [ "$DATABASE_URL" = "$PRODUCTION_DATABASE_URL" ]; then
  echo "❌ DATABASE_URL and PRODUCTION_DATABASE_URL are the same. Aborting."
  exit 1
fi

echo "📥 Dumping data from production..."
pg_dump "$PRODUCTION_DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --format=custom \
  -f "$DUMP_FILE"

echo "🗑️  Truncating dev tables..."
psql "$DATABASE_URL" -c "
  DO \$\$
  DECLARE r RECORD;
  BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
      EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
  END \$\$;
" > /dev/null

echo "📤 Restoring data to development..."
pg_restore \
  --data-only \
  --no-owner \
  --no-privileges \
  -d "$DATABASE_URL" \
  "$DUMP_FILE" 2>&1 || true
  # pg_restore returns non-zero on warnings (e.g. "table not found")
  # which is normal when dev has fewer tables.

rm -f "$DUMP_FILE"

echo ""
echo "✅ Sync complete. Development database now has production data."
