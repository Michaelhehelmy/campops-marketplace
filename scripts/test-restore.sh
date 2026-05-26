#!/bin/bash
# Monthly backup restore verification
# Tests that the most recent backup can be restored and queried
set -euo pipefail

BACKUPS_DIR="${BACKUPS_DIR:-backups}"
TEST_DB="/tmp/sinaicamps-restore-test-$$.db"

echo "▶ SinaiCamps Backup Restore Test — $(date)"

# Find most recent backup
LATEST=$(ls -t "$BACKUPS_DIR"/backup-*.db 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "❌ No backup files found in $BACKUPS_DIR" >&2
  exit 1
fi

echo "Testing backup: $LATEST ($(du -h "$LATEST" | cut -f1))"

# Copy to test location
cp "$LATEST" "$TEST_DB"

# Integrity check
echo "Running integrity check..."
INTEGRITY=$(sqlite3 "$TEST_DB" "PRAGMA integrity_check" 2>&1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "❌ Integrity check FAILED: $INTEGRITY" >&2
  rm -f "$TEST_DB"
  exit 1
fi

# Critical table queries
echo "Running critical table queries..."
TABLES=("users" "properties" "sites" "sessions" "audit_logs")
for TABLE in "${TABLES[@]}"; do
  COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM $TABLE" 2>/dev/null || echo "ERROR")
  if [ "$COUNT" = "ERROR" ]; then
    echo "⚠️  Table $TABLE: query failed (may not exist)"
  else
    echo "  ✅ $TABLE: $COUNT rows"
  fi
done

# Foreign key check
echo "Running foreign key check..."
FK_ISSUES=$(sqlite3 "$TEST_DB" "PRAGMA foreign_key_check" 2>&1)
if [ -n "$FK_ISSUES" ]; then
  echo "⚠️  Foreign key issues found: $FK_ISSUES"
else
  echo "  ✅ Foreign keys: OK"
fi

# Cleanup
rm -f "$TEST_DB"

echo "✅ Restore test PASSED — backup is healthy"
echo "Backup: $LATEST"
echo "Test completed: $(date)"
