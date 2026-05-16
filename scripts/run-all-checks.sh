#!/bin/bash

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

STEP_NAMES=()
STEP_STATUSES=()
STEP_DURATIONS=()
FAILED=0

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}${BOLD}  $1${NC}"
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_section() {
  echo ""
  echo -e "${BLUE}${BOLD}▶ $1${NC}"
  echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
}

print_success() {
  echo -e "${GREEN}${BOLD}✓${NC} ${BOLD}$1${NC}"
}

print_error() {
  echo -e "${RED}${BOLD}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}${BOLD}⚠${NC} $1"
}

print_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

run_step() {
  local name="$1"
  local cmd="$2"
  local output_file
  local start_time
  local end_time
  local duration
  local exit_code

  output_file=$(mktemp)
  start_time=$(date +%s)

  print_section "$name"
  print_info "Running: $cmd"

  set +e
  eval "$cmd" 2>&1 | tee "$output_file"
  exit_code=${PIPESTATUS[0]}
  set -e

  end_time=$(date +%s)
  duration=$((end_time - start_time))

  STEP_NAMES+=("$name")
  STEP_DURATIONS+=("$duration")

  if [ "$exit_code" -eq 0 ]; then
    STEP_STATUSES+=("PASS")
    print_success "$name passed in ${duration}s"
  else
    STEP_STATUSES+=("FAIL")
    FAILED=1
    print_error "$name failed in ${duration}s (exit code: $exit_code)"
    print_warning "Review the output above for details."
  fi

  rm -f "$output_file"
}

print_header "SinaiCamps Full Verification Suite"
print_info "This combines formatting, linting, API/core tests, frontend template tests, and Playwright E2E."

TOTAL_START=$(date +%s)

run_step "Prettier check" "npm run format:check"
run_step "ESLint" "npm run lint"
run_step "API/core + frontend tests" "npm run test:all"
run_step "Playwright E2E" "npm run test:e2e"

TOTAL_END=$(date +%s)
TOTAL_DURATION=$((TOTAL_END - TOTAL_START))
TOTAL_MINUTES=$((TOTAL_DURATION / 60))
TOTAL_SECONDS=$((TOTAL_DURATION % 60))

print_header "Combined Test Summary"
echo ""
printf "  %-32s %-8s %10s\n" "Section" "Status" "Duration"
printf "  %-32s %-8s %10s\n" "────────────────────────────────" "────────" "──────────"

for i in "${!STEP_NAMES[@]}"; do
  printf "  %-32s %-8s %10ss\n" "${STEP_NAMES[$i]}" "${STEP_STATUSES[$i]}" "${STEP_DURATIONS[$i]}"
done

echo ""
printf "  %-32s %-8s %10s\n" "Total" "" "${TOTAL_MINUTES}m ${TOTAL_SECONDS}s"
echo ""

if [ "$FAILED" -eq 0 ]; then
  print_success "All combined checks passed"
  echo ""
  print_info "Included checks:"
  echo "  • Prettier format validation"
  echo "  • ESLint"
  echo "  • API/core Vitest suite"
  echo "  • Frontend template Vitest suite"
  echo "  • Playwright E2E"
  exit 0
fi

print_error "One or more combined checks failed"
echo ""
print_info "Run the individual commands above to isolate the failing area."
exit 1
