# CampOps Testing Guide

This document explains how to run tests for the CampOps frontend application.

## Prerequisites

Ensure you have Node.js and npm installed, then install dependencies:

```bash
npm install
```

## Test Scripts

### Quick Start

Run all tests at once:

```bash
./run-tests.sh
```

Or use npm:

```bash
npm run test:all
```

### Individual Test Commands

#### Linting

```bash
npm run lint              # Check for linting errors
npm run lint:fix         # Auto-fix linting errors
```

#### Code Formatting

```bash
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting
```

#### Unit Tests

```bash
npm run test              # Run unit tests in watch mode
npm run test:ui           # Run unit tests with UI
npm run test:coverage     # Run unit tests with coverage report
```

#### E2E Tests

```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Run E2E tests with UI
npm run test:e2e:coverage # Run E2E tests with coverage
```

### CI/CD Pipeline

```bash
npm run test:ci           # Run tests for CI (lint + unit + e2e)
```

## Comprehensive Test Script

The `run-tests.sh` script provides a comprehensive test suite:

```bash
./run-tests.sh [options]
```

Options:

- `--no-lint` - Skip linting
- `--no-format` - Skip format checking
- `--no-unit` - Skip unit tests
- `--no-e2e` - Skip e2e tests
- `--install` - Install dependencies before running tests
- `--help` - Show help message

Example:

```bash
./run-tests.sh --no-e2e  # Run lint, format, and unit tests only
```

## E2E Test Workflows

The E2E tests cover different user roles and workflows:

### Public User Workflow (`public-user.spec.ts`)

- Landing page navigation
- Rooms, Availability, Blog pages
- Login and Signup navigation
- Responsive design testing

### Guest User Workflow (`guest-user.spec.ts`)

- Profile management
- Stay, Live Bill, Activities pages
- Points and Mining features
- Logout functionality

### Admin User Workflow (`admin-user.spec.ts`)

- Full admin access to all pages
- User management (CRUD operations)
- Role management
- Room and rate plan management
- Inventory and procurement
- Media and blog management
- CMS pages management
- Settings configuration

### Staff User Workflow (`staff-user.spec.ts`)

- POS and Orders management
- Housekeeping tasks
- Roster management
- Inventory access
- Reservations and billing
- Staff profile

### Manager User Workflow (`manager-user.spec.ts`)

- Combined admin and staff access
- Report viewing
- Staff roster management
- Financial reports
- Restricted access compared to admin

### Mining Workflow (`mining-workflow.spec.ts`)

- Mining session management
- Statistics and history
- Progress tracking
- Point calculation
- Error handling

## Authentication Setup

E2E tests use authentication state files stored in `tests/e2e/.auth/` (at the repo root):

- `guest.json` - Guest user authentication
- `admin.json` - Admin user authentication
- `manager.json` - Manager user authentication

To regenerate authentication state, run from the repo root:

```bash
npx playwright test --project=auth
```

## Test Reports

### Unit Test Coverage (all suites)

Run the unified command from the repo root:

```bash
npm run test:coverage:all
```

Coverage HTML reports:

- **Frontend**: `frontend/coverage/index.html`
- **Server**: `coverage-server/index.html`

Open locally:

```bash
open frontend/coverage/index.html    # frontend report
open coverage-server/index.html      # server report
```

### E2E Test Reports

E2E test reports are generated in `playwright-report/` at the repo root. Open:

```bash
open playwright-report/index.html
```

## Troubleshooting

### E2E Tests Fail

- Ensure the dev server is running: `npm run dev`
- Check that the backend API is accessible
- Verify authentication state files exist
- Run `npm run test:e2e:ui` for interactive debugging

### Linting Errors

- Run `npm run lint:fix` to auto-fix most issues
- Check `.eslintrc.cjs` for linting rules

### Format Check Fails

- Run `npm run format` to auto-format code
- Check `.prettierrc` for formatting rules

## Best Practices

1. **Run tests before committing**: Use `npm run test:ci` in CI/CD
2. **Keep tests independent**: Each test should run in isolation
3. **Use descriptive test names**: Make it clear what each test validates
4. **Update authentication state**: When auth flows change, regenerate auth files
5. **Review coverage reports**: Aim for high coverage on critical paths

## Continuous Integration

The test suite runs automatically via GitHub Actions (`.github/workflows/ci.yml`) on every push and pull request:

```yaml
# Root-level unified coverage command
- run: npm run test:coverage:all
```

This runs:

1. `npm run test:coverage --prefix frontend` — frontend unit tests with v8 coverage
2. `npx vitest run --coverage --config vitest.config.server.ts` — server unit tests with istanbul coverage

For full CI including linting:

```bash
npm run test:ci    # (inside frontend/) lint + format:check + coverage + e2e
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
