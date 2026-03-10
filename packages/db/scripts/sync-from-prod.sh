#!/bin/bash
set -euo pipefail

# ─── Sync production data → development database ─────────────
#
# Usage:
#   pnpm --filter @repo/db sync-from-prod              # sync all tables
#   pnpm --filter @repo/db sync-from-prod -- -t fixtures -t odds   # specific tables
#
# Reads PRODUCTION_DATABASE_URL and DATABASE_URL from root .env
# Uses pg_dump (data-only) so schema stays managed by Prisma.

# ─── Ensure pg tools are in PATH (Homebrew keg-only installs) ─
# Pick the highest installed version so pg_dump matches the server.
PG_BIN=""
for pg_dir in /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin; do
  [ -d "$pg_dir" ] && PG_BIN="$pg_dir"
done
if [ -n "$PG_BIN" ]; then
  export PATH="$PG_BIN:$PATH"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DUMP_FILE="$SCRIPT_DIR/.dump.pgdata"

# ─── Parse arguments ────────────────────────────────────────
TABLES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--table)
      TABLES+=("$2")
      shift 2
      ;;
    *)
      echo "❌ Unknown option: $1"
      echo "Usage: sync-from-prod [-- -t table1 -t table2]"
      exit 1
      ;;
  esac
done

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

# ─── Build table flags for pg_dump ──────────────────────────
DUMP_TABLE_FLAGS=()
if [ ${#TABLES[@]} -gt 0 ]; then
  for t in "${TABLES[@]}"; do
    DUMP_TABLE_FLAGS+=("-t" "public.$t")
  done
  echo "📥 Dumping tables from production: ${TABLES[*]}"
else
  echo "📥 Dumping ALL tables from production..."
fi

pg_dump "$PRODUCTION_DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --format=custom \
  ${DUMP_TABLE_FLAGS[@]+"${DUMP_TABLE_FLAGS[@]}"} \
  -f "$DUMP_FILE"

# ─── Truncate target tables in dev ──────────────────────────
if [ ${#TABLES[@]} -gt 0 ]; then
  echo "🗑️  Truncating tables: ${TABLES[*]}"
  for t in "${TABLES[@]}"; do
    psql "$DATABASE_URL" -c "TRUNCATE TABLE public.${t} CASCADE;" > /dev/null 2>&1
  done
else
  echo "🗑️  Truncating all dev tables (preserving _prisma_migrations)..."
  psql "$DATABASE_URL" -c "
    DO \$\$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations') LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END \$\$;
  " > /dev/null
fi

# ─── Restore ────────────────────────────────────────────────
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
if [ ${#TABLES[@]} -gt 0 ]; then
  echo "✅ Sync complete: ${TABLES[*]}"
else
  echo "✅ Sync complete. All tables synced."
fi
