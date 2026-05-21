#!/bin/bash
# SinaiCamps Load / Stress Test Runner
#
# Simulates concurrent traffic against critical API endpoints and reports
# response times, throughput, and error rates.
#
# Usage:
#   ./scripts/load-test.sh                                # Quick smoke (10 req, 2 concurrency)
#   ./scripts/load-test.sh --medium                       # Medium load (100 req, 5 concurrency)
#   ./scripts/load-test.sh --heavy                        # Heavy load (500 req, 20 concurrency)
#   BASE_URL=https://example.com ./scripts/load-test.sh   # Custom target
#
# Prerequisites:
#   - curl  (for basic requests)
#   - ab    (Apache Bench, optional — for higher concurrency tests)
#   - jq    (optional — pretty-prints JSON responses)

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

FAILED=0

case "${1:-}" in
  --medium|-m)
    TOTAL_REQS=100
    CONCURRENCY=5
    ;;
  --heavy|-h)
    TOTAL_REQS=500
    CONCURRENCY=20
    ;;
  *)
    TOTAL_REQS=10
    CONCURRENCY=2
    ;;
esac

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  SinaiCamps Load Test Runner${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Target:       ${BOLD}$BASE_URL${NC}"
echo -e "  Requests:     ${BOLD}$TOTAL_REQS${NC}"
echo -e "  Concurrency:  ${BOLD}$CONCURRENCY${NC}"
echo ""

# ─── Health check warm-up ────────────────────────────────────────────────────

echo -e "${BLUE}${BOLD}▶ Pre-flight health check${NC}"
HEALTH=$(curl -sf "$BASE_URL/api/health" 2>&1) && STATUS="UP" || STATUS="DOWN"
if [ "$STATUS" = "DOWN" ]; then
  echo -e "  ${RED}✗ Server at $BASE_URL is not reachable${NC}"
  echo ""
  echo -e "  Start the dev server with: npm run dev"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Server is reachable"
echo ""

# ─── Helper: run a single-endpoint load test via curl --------------------------

run_curl_test() {
  local label="$1"
  local method="$2"
  local url="$3"
  local body="$4"
  local expected_code="${5:-200}"

  local pass=0
  local fail=0
  local total_time=0
  local min_time=999999
  local max_time=0

  for i in $(seq 1 "$TOTAL_REQS"); do
    local start
    local elapsed
    local http_code

    start=$(date +%s%N)

    if [ "$method" = "GET" ]; then
      http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$url" 2>/dev/null)
    else
      http_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -d "$body" "$BASE_URL$url" 2>/dev/null)
    fi

    elapsed=$(( ($(date +%s%N) - start) / 1000000 ))

    total_time=$((total_time + elapsed))
    [ "$elapsed" -lt "$min_time" ] && min_time=$elapsed
    [ "$elapsed" -gt "$max_time" ] && max_time=$elapsed

    if [ "$http_code" = "$expected_code" ]; then
      pass=$((pass + 1))
    else
      fail=$((fail + 1))
    fi
  done

  local avg=0
  [ "$TOTAL_REQS" -gt 0 ] && avg=$((total_time / TOTAL_REQS))

  echo -e "  ${BOLD}$label${NC}"
  echo -e "    URL:      ${CYAN}$method $url${NC}"
  echo -e "    Pass:     ${GREEN}$pass${NC} / ${YELLOW}$fail${NC} failed (expected $expected_code)"
  echo -e "    Latency:  avg=${BLUE}${avg}ms${NC} min=${BLUE}${min_time}ms${NC} max=${BLUE}${max_time}ms${NC}"
  echo ""

  [ "$fail" -gt 0 ] && FAILED=1
}

# ─── Helper: run ab (Apache Bench) if available ------------------------------

run_ab_test() {
  local label="$1"
  local method="$2"
  local url="$3"
  local body="$4"

  if ! command -v ab &>/dev/null; then
    echo -e "  ${YELLOW}⚠ Skipping ab test for $label (ab not installed)${NC}"
    echo ""
    return
  fi

  local tmpfile
  tmpfile=$(mktemp)

  if [ "$method" = "GET" ]; then
    ab -n "$TOTAL_REQS" -c "$CONCURRENCY" \
      -H "Content-Type: application/json" \
      "$BASE_URL$url" 2>"$tmpfile" >"$tmpfile"
  else
    echo "$body" > "$tmpfile.body"
    ab -n "$TOTAL_REQS" -c "$CONCURRENCY" \
      -H "Content-Type: application/json" \
      -p "$tmpfile.body" -T "application/json" \
      "$BASE_URL$url" 2>"$tmpfile" >"$tmpfile"
    rm -f "$tmpfile.body"
  fi

  local rps
  local p50
  local p95
  rps=$(grep "Requests per second" "$tmpfile" | awk '{print $4}')
  p50=$(grep "50%" "$tmpfile" | awk '{print $2}')
  p95=$(grep "95%" "$tmpfile" | awk '{print $2}')

  echo -e "  ${BOLD}$label (ab)${NC}"
  echo -e "    URL:       ${CYAN}$method $url${NC}"
  echo -e "    Requests/sec: ${BLUE}${rps:-N/A}${NC}"
  echo -e "    p50 latency:  ${BLUE}${p50:-N/A}ms${NC}"
  echo -e "    p95 latency:  ${BLUE}${p95:-N/A}ms${NC}"
  echo ""

  rm -f "$tmpfile"
}

# ─── Test suites ──────────────────────────────────────────────────────────────

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  1. Public API endpoints${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

run_curl_test "Health check" "GET" "/api/health" "" 200
run_curl_test "Public search" "GET" "/api/public/search" "" 200
run_curl_test "Public categories" "GET" "/api/public/categories" "" 200
run_curl_test "Featured listings" "GET" "/api/public/featured-listings" "" 200

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  2. Auth & Session endpoints${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

run_curl_test "Get session (unauthenticated)" "GET" "/api/auth/get-session" "" 401
run_curl_test "Branding lookup" "GET" "/api/branding?slug=nonexistent" "" 404

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  3. Protected endpoints (expecting 401/403)${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

run_curl_test "Master listings (no auth)" "GET" "/api/master/listings" "" 401
run_curl_test "Master stats (no auth)" "GET" "/api/master/stats" "" 401
run_curl_test "Manage bookings (no auth)" "GET" "/api/manage/prop-1/bookings" "" 401
run_curl_test "Guest dashboard (no auth)" "GET" "/api/guest/dashboard" "" 401
run_curl_test "Site plugins (no auth)" "GET" "/api/site/plugins" "" 401

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  4. Apache Bench (concurrent)${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

run_ab_test "Health endpoint" "GET" "/api/health" ""
run_ab_test "Public search" "GET" "/api/public/search" ""

# ─── Summary ──────────────────────────────────────────────────────────────────

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  Load Test Complete${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Target:       ${BOLD}$BASE_URL${NC}"
echo -e "  Mode:         ${BOLD}${1:-quick}${NC}"
echo -e "  Requests:     ${BOLD}$TOTAL_REQS${NC} per endpoint"
echo -e "  Concurrency:  ${BOLD}$CONCURRENCY${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}✓ All endpoints responded as expected${NC}"
  echo ""
  exit 0
else
  echo -e "  ${RED}${BOLD}✗ Some endpoints returned unexpected status codes${NC}"
  echo ""
  exit 1
fi
