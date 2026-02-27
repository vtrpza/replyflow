#!/bin/bash
# Post-deploy smoke test for ReplyFlow.
# Usage: bash scripts/smoke-test.sh [base_url]

set -euo pipefail

BASE_URL="${1:-https://replyflow.fly.dev}"
FAILURES=0

check() {
  local label="$1"
  local url="$2"
  local expected="${3:-200}"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url")
  if [ "$STATUS" = "$expected" ]; then
    echo "[${label}]  ${STATUS} PASS"
  else
    echo "[${label}]  ${STATUS} FAIL (expected ${expected})"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "=== ReplyFlow Smoke Test ==="
echo "Target: $BASE_URL"
echo ""

check "health " "$BASE_URL/api/health"
check "landing" "$BASE_URL"
check "signin " "$BASE_URL/app/signin"

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "=== All checks passed ==="
else
  echo "=== $FAILURES check(s) failed ==="
  exit 1
fi
