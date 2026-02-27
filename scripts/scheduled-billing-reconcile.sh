#!/bin/bash
# Trigger system billing reconciliation on the deployed ReplyFlow instance.
# Requires BILLING_RECONCILE_TOKEN env var to be set.

set -euo pipefail

BASE_URL="${REPLYFLOW_URL:-https://replyflow.fly.dev}"

if [ -z "${BILLING_RECONCILE_TOKEN:-}" ]; then
  echo "ERROR: BILLING_RECONCILE_TOKEN is not set" >&2
  exit 1
fi

echo "Triggering billing reconciliation at $BASE_URL ..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/billing/reconcile/system" \
  -H "x-replyflow-billing-token: ${BILLING_RECONCILE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxUsers":50}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP $HTTP_CODE"
echo "$BODY"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "Billing reconciliation triggered successfully."
else
  echo "ERROR: Billing reconciliation failed with HTTP $HTTP_CODE" >&2
  exit 1
fi
