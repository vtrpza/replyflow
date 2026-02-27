#!/bin/bash
# Backup SQLite database from the Fly.io volume.
# Requires flyctl to be installed and authenticated.

set -euo pipefail

APP="${FLY_APP:-replyflow}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d-%H%M%S)
REMOTE_BACKUP="/data/backup-${DATE}.db"
LOCAL_FILE="${BACKUP_DIR}/gitjobs-${DATE}.db"

mkdir -p "$BACKUP_DIR"

echo "=== ReplyFlow Database Backup ==="
echo "App:    $APP"
echo "Target: $LOCAL_FILE"

# Create a safe backup using SQLite's .backup command (consistent snapshot)
echo "[1/3] Creating backup on remote volume..."
flyctl ssh console -a "$APP" -C "sqlite3 /data/gitjobs.db '.backup ${REMOTE_BACKUP}'"

# Download the backup file
echo "[2/3] Downloading backup..."
flyctl ssh sftp get -a "$APP" "$REMOTE_BACKUP" "$LOCAL_FILE"

# Clean up remote backup
echo "[3/3] Cleaning up remote file..."
flyctl ssh console -a "$APP" -C "rm ${REMOTE_BACKUP}"

SIZE=$(du -h "$LOCAL_FILE" | cut -f1)
echo "=== Backup complete: $LOCAL_FILE ($SIZE) ==="
