#!/bin/bash
# Stripe Sandbox Payment Flow Test Runner
# 
# This script runs the full Stripe payment flow integration tests.
# It can use actual Stripe test keys or run in mock mode.
#
# Usage:
#   ./scripts/test-stripe-flow.sh                    # Run with mock data (no real Stripe calls)
#   ./scripts/test-stripe-flow.sh --live               # Run with actual Stripe API (requires keys)
#
# Environment variables required for live mode:
#   STRIPE_SECRET_KEY_TEST=sk_test_...
#   STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

MODE="${1:-mock}"

echo "═══════════════════════════════════════════════════════════════"
echo "  Stripe Sandbox Payment Flow Tests"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if running with actual Stripe API
if [ "$MODE" == "--live" ] || [ "$MODE" == "live" ]; then
    echo "🔴 LIVE MODE: Tests will call actual Stripe API"
    echo ""
    
    if [ -z "$STRIPE_SECRET_KEY_TEST" ]; then
        echo "❌ Error: STRIPE_SECRET_KEY_TEST environment variable not set"
        echo "   Get your test keys from: https://dashboard.stripe.com/test/apikeys"
        echo ""
        echo "   Set it with:"
        echo "   export STRIPE_SECRET_KEY_TEST=sk_test_..."
        exit 1
    fi
    
    if [ -z "$STRIPE_PUBLISHABLE_KEY_TEST" ]; then
        echo "⚠️  Warning: STRIPE_PUBLISHABLE_KEY_TEST not set (some tests may skip)"
    fi
    
    echo "✅ Stripe test keys configured"
    echo "   Secret Key: ${STRIPE_SECRET_KEY_TEST:0:10}..."
    echo ""
else
    echo "🟡 MOCK MODE: Running with simulated Stripe responses"
    echo "   No actual API calls will be made"
    echo ""
    echo "   To run with live Stripe API:"
    echo "   $0 --live"
    echo ""
fi

# Check database
echo "🗄️  Checking database connection..."
if ! pg_isready -q -h localhost -p 5432 2>/dev/null; then
    echo "❌ PostgreSQL not running on localhost:5432"
    echo "   Start PostgreSQL with: sudo systemctl start postgresql"
    exit 1
fi
echo "✅ PostgreSQL is running"
echo ""

# Set test database URL
export DATABASE_URL="${DATABASE_URL:-postgresql://sinaicamps:sinaicamps@localhost:5432/sinaicamps_test}"

echo "🧪 Running Stripe sandbox tests..."
echo ""

# Run the tests
if [ "$MODE" == "--live" ] || [ "$MODE" == "live" ]; then
    npx vitest run src/lib/__tests__/stripe-sandbox.test.ts --reporter=verbose
else
    # Mock mode - tests run but skip actual API calls
    npx vitest run src/lib/__tests__/stripe-sandbox.test.ts --reporter=verbose
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Test Complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ "$MODE" != "--live" ] && [ "$MODE" != "live" ]; then
    echo "💡 To test with actual Stripe API:"
    echo "   1. Get test keys: https://dashboard.stripe.com/test/apikeys"
    echo "   2. export STRIPE_SECRET_KEY_TEST=sk_test_..."
    echo "   3. export STRIPE_PUBLISHABLE_KEY_TEST=pk_test_..."
    echo "   4. $0 --live"
    echo ""
fi

echo "✅ Stripe payment flow validation complete"
