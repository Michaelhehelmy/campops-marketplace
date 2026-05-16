#!/bin/bash

# SinaiCamps Comprehensive Test Script
# This script runs all quality checks: lint, format, unit tests, and e2e tests

set -e  # Exit on error
set -o pipefail  # Catch errors in piped commands

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print formatted output
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

print_metric() {
    echo -e "  ${CYAN}•${NC} $1: ${BOLD}$2${NC}"
}

# Run command and capture output
run_command() {
    local cmd="$1"
    local output_file=$(mktemp)
    local exit_code=0
    
    # Run command and capture output
    if ! eval "$cmd" > "$output_file" 2>&1; then
        exit_code=1
    fi
    
    # Print output (filtered)
    if [ -s "$output_file" ]; then
        # Filter and format output
        grep -v "^$" "$output_file" | grep -v "^npm WARN" | grep -v "^npm notice" | \
        grep -v "^npm error code" | grep -v "^npm error path" | \
        grep -v "^npm error workspace" | grep -v "^npm error location" | \
        grep -v "^npm error command" | head -50 | while read line; do
            echo "    $line"
        done
    fi
    
    rm -f "$output_file"
    return $exit_code
}

# Resolve frontend directory — works whether run from repo root or frontend/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"
cd "$FRONTEND_DIR"

if [ ! -f "package.json" ]; then
    print_error "Could not locate frontend/package.json"
    exit 1
fi

# Parse command line arguments
RUN_LINT=false
RUN_FORMAT=false
RUN_UNIT=true
RUN_E2E=false
INSTALL_DEPS=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --lint)
            RUN_LINT=true
            shift
            ;;
        --no-lint)
            RUN_LINT=false
            shift
            ;;
        --format)
            RUN_FORMAT=true
            shift
            ;;
        --no-format)
            RUN_FORMAT=false
            shift
            ;;
        --no-unit)
            RUN_UNIT=false
            shift
            ;;
        --no-e2e)
            RUN_E2E=false
            shift
            ;;
        --e2e)
            RUN_E2E=true
            shift
            ;;
        --install)
            INSTALL_DEPS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: ./run-tests.sh [options]"
            echo ""
            echo "Options:"
            echo "  --lint         Run ESLint (default: off)"
            echo "  --no-lint      Skip linting"
            echo "  --format       Run Prettier check (default: off)"
            echo "  --no-format    Skip format checking"
            echo "  --no-unit      Skip unit tests"
            echo "  --e2e          Include e2e tests (default: off)"
            echo "  --install      Install dependencies first"
            echo "  --verbose      Show full output"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Install dependencies if requested
if [ "$INSTALL_DEPS" = true ]; then
    print_section "Installing Dependencies"
    if [ "$VERBOSE" = true ]; then
        npm install
    else
        npm install --silent 2>&1 | grep -v "^npm WARN" | grep -v "^npm notice" || true
    fi
    print_success "Dependencies installed"
fi

# Start timer
START_TIME=$(date +%s)

print_header "SinaiCamps Comprehensive Test Suite"

# Initialize counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# ============================================================================
# STEP 1: LINTING
# ============================================================================
if [ "$RUN_LINT" = true ]; then
    print_section "Step 1/4: ESLint"
    print_info "Checking code for linting errors..."
    echo ""
    
    if [ "$VERBOSE" = true ]; then
        if npm run lint 2>&1; then
            print_success "ESLint passed - no errors found"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            print_error "ESLint found errors"
            print_warning "Run 'npm run lint:fix' to auto-fix linting issues"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            exit 1
        fi
    else
        # Capture and filter output
        LINT_OUTPUT=$(npm run lint 2>&1) || LINT_EXIT=1
        
        if [ -z "$LINT_EXIT" ]; then
            # Extract warning count
            WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -oP '\d+ problems?' | head -1 || echo "0")
            echo "$LINT_OUTPUT" | grep -E "warning|error" | head -20 | while read line; do
                echo "    $line"
            done
            print_success "ESLint passed with $WARNING_COUNT"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo "$LINT_OUTPUT" | tail -30 | while read line; do
                echo "    $line"
            done
            print_error "ESLint failed"
            print_warning "Run 'npm run lint:fix' to auto-fix linting issues"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            exit 1
        fi
    fi
else
    print_section "Step 1/4: ESLint"
    print_warning "Skipping ESLint (--no-lint flag used)"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
fi

# ============================================================================
# STEP 2: FORMAT CHECKING
# ============================================================================
if [ "$RUN_FORMAT" = true ]; then
    print_section "Step 2/4: Prettier Format Check"
    print_info "Checking code formatting..."
    echo ""
    
    if npm run format:check > /dev/null 2>&1; then
        print_success "All files are properly formatted"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "Code formatting issues detected"
        print_warning "Run 'npm run format' to auto-format all files"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        exit 1
    fi
else
    print_section "Step 2/4: Prettier Format Check"
    print_warning "Skipping format check (--no-format flag used)"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
fi

# ============================================================================
# STEP 3: UNIT TESTS WITH COVERAGE
# ============================================================================
if [ "$RUN_UNIT" = true ]; then
    print_section "Step 3/4: Unit Tests with Coverage"
    print_info "Running unit tests..."
    echo ""
    
    # Create temp file for output
    UNIT_OUTPUT=$(mktemp)
    UNIT_EXIT=0
    
    # Run tests and capture output, preserving exit code
    npx vitest run --coverage 2>&1 | tee "$UNIT_OUTPUT" || UNIT_EXIT=$?
    
    if [ $UNIT_EXIT -eq 0 ]; then
        echo ""
        print_success "All unit tests passed"
        
        # Extract coverage metrics from the table
        COVERAGE_LINE=$(grep -E "^All files" "$UNIT_OUTPUT" | head -1)
        if [ -n "$COVERAGE_LINE" ]; then
            # Parse coverage percentages (format: All files | 69.19 | 24.78 | 56.28 | 71.58 |)
            STMTS=$(echo "$COVERAGE_LINE" | awk -F'|' '{print $2}' | tr -d ' ')
            BRANCH=$(echo "$COVERAGE_LINE" | awk -F'|' '{print $3}' | tr -d ' ')
            FUNCS=$(echo "$COVERAGE_LINE" | awk -F'|' '{print $4}' | tr -d ' ')
            LINES=$(echo "$COVERAGE_LINE" | awk -F'|' '{print $5}' | tr -d ' ')
            
            echo ""
            print_info "Coverage Summary:"
            print_metric "Statements" "${STMTS}%"
            print_metric "Branches" "${BRANCH}%"
            print_metric "Functions" "${FUNCS}%"
            print_metric "Lines" "${LINES}%"
        fi
        
        # Extract test count
        TEST_COUNT=$(grep -E "Test Files" "$UNIT_OUTPUT" | grep -oP '\d+ passed' | grep -oP '\d+' || echo "0")
        echo ""
        print_info "$TEST_COUNT test files passed"
        print_info "Coverage report: ${BOLD}coverage/index.html${NC}"
        
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo ""
        print_error "Unit tests failed (exit code: $UNIT_EXIT)"
        
        # Show failed tests
        FAILED_TESTS=$(grep -E "FAIL|failed|Error:" "$UNIT_OUTPUT" | head -15)
        if [ -n "$FAILED_TESTS" ]; then
            echo ""
            print_error "Failed Tests:"
            echo "$FAILED_TESTS" | while read line; do
                echo "    $line"
            done
        fi
        
        rm -f "$UNIT_OUTPUT"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        exit 1
    fi
    
    rm -f "$UNIT_OUTPUT"
else
    print_section "Step 3/4: Unit Tests with Coverage"
    print_warning "Skipping unit tests (--no-unit flag used)"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
fi

# ============================================================================
# STEP 4: E2E TESTS
# ============================================================================
if [ "$RUN_E2E" = true ]; then
    print_section "Step 4/4: E2E Tests (Playwright)"
    print_info "Running end-to-end browser tests..."
    print_info "This will test: Public, Guest, Admin, Staff, Manager, and Mining workflows"
    echo ""
    
    # Check if dev server is already running
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_warning "Dev server already running on port 5173"
    fi
    
    E2E_OUTPUT=$(mktemp)
    E2E_EXIT=0
    
    # Run tests and capture output, preserving exit code
    npx playwright test --reporter=line 2>&1 | tee "$E2E_OUTPUT" || E2E_EXIT=$?
    
    if [ $E2E_EXIT -eq 0 ]; then
        echo ""
        print_success "All E2E tests passed"
        
        # Extract test count
        E2E_PASSED=$(grep -oP '\d+ passed' "$E2E_OUTPUT" | head -1 || echo "0 passed")
        echo ""
        print_info "E2E Results: $E2E_PASSED"
        print_info "E2E report: ${BOLD}playwright-report/index.html${NC}"
        
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo ""
        print_error "E2E tests failed (exit code: $E2E_EXIT)"
        
        # Show failed tests summary
        FAILED=$(grep -E "failed|FAIL|Error:" "$E2E_OUTPUT" | head -15)
        if [ -n "$FAILED" ]; then
            echo ""
            print_error "Failed Tests/Errors:"
            echo "$FAILED" | while read line; do
                echo "    $line"
            done
        fi
        
        print_warning "Run 'npm run test:e2e:ui' to debug in interactive mode"
        
        rm -f "$E2E_OUTPUT"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        exit 1
    fi
    
    rm -f "$E2E_OUTPUT"
else
    print_section "Step 4/4: E2E Tests (Playwright)"
    print_warning "Skipping E2E tests (--no-e2e flag used)"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
fi

# ============================================================================
# SUMMARY
# ============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
print_header "Test Suite Summary"

echo ""
print_info "Results:"
if [ $TESTS_PASSED -gt 0 ]; then
    print_metric "Passed" "$TESTS_PASSED"
fi
if [ $TESTS_FAILED -gt 0 ]; then
    print_metric "Failed" "$TESTS_FAILED"
fi
if [ $TESTS_SKIPPED -gt 0 ]; then
    print_metric "Skipped" "$TESTS_SKIPPED"
fi

echo ""
print_metric "Duration" "${MINUTES}m ${SECONDS}s"

# Check total - passed should equal total steps run (4 - skipped)
TOTAL_STEPS_RUN=$((4 - TESTS_SKIPPED))

if [ $TESTS_FAILED -eq 0 ] && [ $TESTS_PASSED -eq $TOTAL_STEPS_RUN ]; then
    echo ""
    print_success "All Tests Passed Successfully!"
    
    echo ""
    print_info "Next Steps:"
    if [ -d "coverage" ]; then
        echo -e "  • View coverage report: ${BOLD}coverage/index.html${NC}"
    fi
    if [ -d "playwright-report" ]; then
        echo -e "  • View E2E report: ${BOLD}playwright-report/index.html${NC}"
    fi
    echo -e "  • Run individual checks: ${BOLD}npm run <script>${NC}"
    echo ""
    exit 0
else
    echo ""
    print_error "Some tests failed. Please review the errors above."
    echo ""
    exit 1
fi
