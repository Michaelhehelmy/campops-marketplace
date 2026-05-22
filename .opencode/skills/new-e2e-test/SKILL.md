---
name: new-e2e-test
description: Add a new Playwright E2E test to the SinaiCamps test suite
---

## When to use
When the user asks to add an E2E test for a new feature or page.

## Directory structure
```
e2e/
├── pages/          ← Page Object Models (POMs) — one per page
└── tests/          ← Test spec files
```

## Steps

1. **Identify the page** — does a POM already exist in `e2e/pages/`?
   - If yes → reuse it
   - If no → create `e2e/pages/{PageName}Page.ts`

2. **Create the POM** (if needed):
   ```typescript
   import { Page, Locator } from '@playwright/test'

   export class MyPage {
     readonly page: Page
     readonly submitButton: Locator

     constructor(page: Page) {
       this.page = page
       this.submitButton = page.getByTestId('submit-btn')
     }

     async goto() {
       await this.page.goto('/en/my-page')
     }
   }
   ```

3. **Write the test spec** in `e2e/tests/`:
   ```typescript
   import { test, expect } from '@playwright/test'
   import { MyPage } from '../pages/MyPage'

   test.describe('My Feature', () => {
     test('should do X when Y', async ({ page }) => {
       const myPage = new MyPage(page)
       await myPage.goto()
       await expect(myPage.submitButton).toBeVisible()
     })
   })
   ```

4. **Use `data-testid` selectors** — never use CSS classes or text strings as selectors

5. **Run only the new test** first:
   ```bash
   npx playwright test e2e/tests/my-test.spec.ts --headed
   ```

6. **Run the full suite** to ensure nothing is broken:
   ```bash
   npm run test:e2e
   ```

## Rules
- Always use the POM pattern — no inline page interactions in test files
- Use `data-testid` attributes, never CSS selectors
- Tests must be idempotent — can run in any order, multiple times
- Use `test.beforeEach` for setup, `test.afterEach` for cleanup
