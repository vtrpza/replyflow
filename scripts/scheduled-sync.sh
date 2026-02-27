#!/bin/bash
# Trigger system sync on the deployed ReplyFlow instance.
# Requires REPLYFLOW_SYNC_TOKEN env var to be set.

set -euo pipefail

BASE_URL="${REPLYFLOW_URL:-https://replyflow.fly.dev}"

if [ -z "${REPLYFLOW_SYNC_TOKEN:-}" ]; then
  echo "ERROR: REPLYFLOW_SYNC_TOKEN is not set" >&2
  exit 1
fi

echo "Triggering system sync at $BASE_URL ..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/sync/system" \
  -H "x-replyflow-sync-token: ${REPLYFLOW_SYNC_TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP $HTTP_CODE"
echo "$BODY"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "Sync triggered successfully."
else
  echo "ERROR: Sync failed with HTTP $HTTP_CODE" >&2
  exit 1
fi
