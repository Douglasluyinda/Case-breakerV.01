#!/usr/bin/env bash
# smoke-test.sh — Production readiness check for Case Breaker backend
#
# Usage:
#   ./scripts/smoke-test.sh https://your-railway-app.up.railway.app
#
# Exits 0 if all checks pass, 1 if any fail.

set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage: $0 <backend-url>"
  echo "  e.g. $0 https://case-breaker.up.railway.app"
  exit 1
fi

BASE_URL="${BASE_URL%/}"   # strip trailing slash

PASS=0
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local body_contains="${4:-}"

  local response
  response=$(curl -s -o /tmp/smoke_body -w "%{http_code}" "$url" --max-time 10 2>/dev/null || echo "000")

  local body
  body=$(cat /tmp/smoke_body 2>/dev/null || echo "")

  local ok=true
  [[ "$response" != "$expected_status" ]] && ok=false
  [[ -n "$body_contains" && "$body" != *"$body_contains"* ]] && ok=false

  if $ok; then
    printf "  ${GREEN}✓${NC} %-45s HTTP %s\n" "$label" "$response"
    ((PASS++))
  else
    printf "  ${RED}✗${NC} %-45s HTTP %s (expected %s)\n" "$label" "$response" "$expected_status"
    [[ -n "$body_contains" ]] && printf "      Expected body to contain: %s\n" "$body_contains"
    ((FAIL++))
  fi
}

echo ""
echo "  Case Breaker — Smoke Test"
echo "  Target: $BASE_URL"
echo "  $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "  ─────────────────────────────────────────────────────"
echo ""
echo "  ${YELLOW}► Health${NC}"
check "GET /health returns ok"              "$BASE_URL/health"             200 '"status":"ok"'

echo ""
echo "  ${YELLOW}► OpenAPI${NC}"
check "GET /docs returns Swagger UI"        "$BASE_URL/docs"               200 "swagger"
check "GET /docs/json returns spec"         "$BASE_URL/docs/json"          200 '"openapi"'

echo ""
echo "  ${YELLOW}► Public routes (no auth)${NC}"
check "GET /products returns array"         "$BASE_URL/products"           200 '"id"'
check "GET /auth/me rejects without token"  "$BASE_URL/auth/me"            401

echo ""
echo "  ${YELLOW}► Auth guard${NC}"
check "GET /purchases requires auth"        "$BASE_URL/purchases"          401
check "POST /checkout requires auth"        "$BASE_URL/checkout"           401
check "GET /subscriptions/me requires auth" "$BASE_URL/subscriptions/me"   401
check "GET /admin/stats requires auth"      "$BASE_URL/admin/stats"        401

echo ""
echo "  ─────────────────────────────────────────────────────"
printf "  Results: ${GREEN}%d passed${NC}" "$PASS"
if [[ $FAIL -gt 0 ]]; then
  printf "  ${RED}%d failed${NC}" "$FAIL"
fi
echo ""
echo ""

[[ $FAIL -eq 0 ]]
