#!/bin/bash
# CampOps Marketplace — Database Backup Script
#
# Usage: bash scripts/backup-db.sh
#
# To automate daily backups via crontab:
#   crontab -e
#   0 3 * * * bash /path/to/marketplace/scripts/backup-db.sh && bash /path/to/marketplace/scripts/backup-s3.sh
#
# To automate via systemd timer:
#   Create a .service and .timer unit file in /etc/systemd/system/
set -e

# Create backups directory if it doesn't exist
BACKUPS_DIR="backups"
mkdir -p "$BACKUPS_DIR"

# Resolve DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  if [ -f .env.production ]; then
    DATABASE_URL=$(grep '^DATABASE_URL=' .env.production | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  elif [ -f .env ]; then
    DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  fi
fi

# Fallback default if still empty
if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL="file:./campops-prod-sim.db"
fi

TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Detect Database Type and Run Backup
if [[ "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; then
  echo "Detected PostgreSQL database. Starting pg_dump..."
  BACKUP_FILE="$BACKUPS_DIR/backup-postgres-$TIMESTAMP.dump"
  
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump "$DATABASE_URL" -F c -b -v -f "$BACKUP_FILE"
    echo "PostgreSQL backup successfully completed: $BACKUP_FILE"
  else
    echo "WARNING: pg_dump utility not found! Cannot perform PostgreSQL backup." >&2
    exit 1
  fi

else
  echo "Detected SQLite database. Starting SQLite backup..."
  BACKUP_FILE="$BACKUPS_DIR/backup-sqlite-$TIMESTAMP.db"
  
  # Strip "file:" prefix if present
  DB_FILE=$(echo "$DATABASE_URL" | sed 's/^file://')
  if [ ! -f "$DB_FILE" ]; then
    # Fallback to check if default SQLite file exists
    if [ -f "campops-prod-sim.db" ]; then
      DB_FILE="campops-prod-sim.db"
    else
      echo "WARNING: SQLite database file not found at '$DB_FILE'. Skipping backup." >&2
      exit 0
    fi
  fi
  
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
    echo "SQLite backup successfully completed: $BACKUP_FILE"
  else
    # Fallback copy if sqlite3 CLI is not installed
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "SQLite backup completed via file copy: $BACKUP_FILE"
  fi
fi

# Clean up older backups (keep last 10)
echo "Cleaning up old backups (keeping top 10)..."
ls -tp "$BACKUPS_DIR"/backup-* 2>/dev/null | tail -n +11 | xargs -I {} rm -- {} || true
echo "Backup routine finished."
