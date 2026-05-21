#!/bin/bash
# scripts/backup-s3.sh — Uploads latest local backup to S3-compatible storage
# Called from: deploy.yml, cron job (daily)
set -e

BACKUPS_DIR="backups"
S3_BUCKET="${S3_BACKUP_BUCKET:-campops-marketplace-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Ensure local backup exists
if [ ! -d "$BACKUPS_DIR" ]; then
  echo "No backups directory found. Run scripts/backup-db.sh first."
  exit 1
fi

# Find the latest local backup file
LATEST_BACKUP=$(ls -t "$BACKUPS_DIR"/backup-* 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "No backup files found. Creating one..."
  bash scripts/backup-db.sh
  LATEST_BACKUP=$(ls -t "$BACKUPS_DIR"/backup-* | head -1)
fi

# Upload using available tool
if command -v aws &>/dev/null; then
  S3_CMD="aws s3 cp"
  if [ -n "$S3_ENDPOINT" ]; then
    S3_CMD="$S3_CMD --endpoint-url $S3_ENDPOINT"
  fi
  $S3_CMD "$LATEST_BACKUP" "s3://$S3_BUCKET/$(basename "$LATEST_BACKUP")" --region "${S3_REGION:-auto}"
  echo "Remote backup uploaded: $LATEST_BACKUP"

elif command -v curl &>/dev/null && [ -n "$S3_PRESIGNED_URL" ]; then
  curl -T "$LATEST_BACKUP" "$S3_PRESIGNED_URL"
  echo "Remote backup uploaded via presigned URL."

else
  echo "WARNING: Neither 'aws' CLI nor S3_PRESIGNED_URL is available. Remote backup skipped."
  echo "Install AWS CLI: sudo snap install aws-cli --classic"
  exit 0
fi
