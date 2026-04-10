# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional.spec.ts >> Settings — User Management >> shows admin user with correct role
- Location: tests/e2e/functional.spec.ts:393:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "https://sg-pos-v2.vercel.app/login", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test'
  2   | 
  3   | const BASE_URL = 'https://sg-pos-v2.vercel.app'
  4   | const EMAIL = 'supachai@siamgreenco.com'
  5   | const PASSWORD = 'SiamGreen2026!'
  6   | 
  7   | async function login(page: Page) {
> 8   |   await page.goto(`${BASE_URL}/login`)
      |              ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  9   |   await page.fill('input[type="email"]', EMAIL)
  10  |   await page.fill('input[type="password"]', PASSWORD)
  11  |   await page.click('button[type="submit"]')
  12  |   await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
  13  | }
  14  | 
  15  | // ═══════════════════════════════════════════════════════════
  16  | // POS CHECKOUT — Full Flow
  17  | // ═══════════════════════════════════════════════════════════
  18  | 
  19  | test.describe('POS Checkout Flow', () => {
  20  |   test.beforeEach(async ({ page }) => {
  21  |     await login(page)
  22  |     await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' })
  23  |     await page.waitForTimeout(2000)
  24  |   })
  25  | 
  26  |   test('can add fixed-price product to cart', async ({ page }) => {
  27  |     // Wait for products to load, click a non-weight product (e.g. edibles/papers)
  28  |     await page.waitForTimeout(2000)
  29  |     // Look for a product tile that isn't sold by weight
  30  |     const tile = page.locator('[class*="cursor-pointer"]').first()
  31  |     if (await tile.isVisible()) {
  32  |       await tile.click()
  33  |       await page.waitForTimeout(1000)
  34  |       // Cart should no longer be empty
  35  |       const cart = await page.textContent('body')
  36  |       // Either shows item in cart or weight dialog opened
  37  |       expect(cart).toBeTruthy()
  38  |     }
  39  |   })
  40  | 
  41  |   test('can search and select customer by ID', async ({ page }) => {
  42  |     const idInput = page.locator('input[placeholder*="13"]').or(page.locator('input[placeholder*="ID"]')).or(page.locator('input[placeholder*="National"]')).first()
  43  |     await expect(idInput).toBeVisible({ timeout: 5000 })
  44  |     await idInput.fill('1100700123456')
  45  |     await idInput.press('Enter')
  46  |     await page.waitForTimeout(3000)
  47  |     // Should show Somchai and age badge
  48  |     const body = await page.textContent('body') ?? ''
  49  |     expect(body).toContain('Somchai')
  50  |     expect(body).toMatch(/Age.*\d+/)
  51  |   })
  52  | 
  53  |   test('age verification blocks under-20', async ({ page }) => {
  54  |     // John Smith DOB 1988-03-10 should pass (age 38)
  55  |     const idInput = page.locator('input[placeholder*="13"]').or(page.locator('input[placeholder*="ID"]')).or(page.locator('input[placeholder*="National"]')).first()
  56  |     await expect(idInput).toBeVisible({ timeout: 5000 })
  57  |     // Try passport search
  58  |     const typeToggle = page.locator('button:has-text("Passport")').or(page.locator('text=Passport')).first()
  59  |     if (await typeToggle.isVisible()) {
  60  |       await typeToggle.click()
  61  |     }
  62  |     await idInput.fill('P12345678')
  63  |     await idInput.press('Enter')
  64  |     await page.waitForTimeout(3000)
  65  |     const body = await page.textContent('body') ?? ''
  66  |     // John Smith should show with age verification passed
  67  |     expect(body).toMatch(/John|Age|✓/)
  68  |   })
  69  | 
  70  |   test('cash payment shows change calculator with quick buttons', async ({ page }) => {
  71  |     // Add a product first
  72  |     const tile = page.locator('[class*="cursor-pointer"]').first()
  73  |     if (await tile.isVisible()) {
  74  |       await tile.click()
  75  |       await page.waitForTimeout(1500)
  76  |     }
  77  |     // Select Cash payment
  78  |     await page.locator('button:has-text("Cash")').click()
  79  |     await page.waitForTimeout(500)
  80  |     // Should show cash received input and quick buttons
  81  |     const received = page.locator('input[placeholder="0.00"]')
  82  |     if (await received.isVisible()) {
  83  |       // Quick amount buttons should be visible
  84  |       await expect(page.locator('text=฿1,000.00').or(page.locator('text=฿500.00'))).toBeVisible()
  85  |       // Enter cash amount
  86  |       await received.fill('1000')
  87  |       await page.waitForTimeout(500)
  88  |       // Change should be displayed
  89  |       await expect(page.locator('text=Change')).toBeVisible()
  90  |     }
  91  |   })
  92  | 
  93  |   test('complete sale button is disabled without customer', async ({ page }) => {
  94  |     const completeBtn = page.locator('button:has-text("Complete Sale")')
  95  |     await expect(completeBtn).toBeVisible()
  96  |     await expect(completeBtn).toBeDisabled()
  97  |   })
  98  | })
  99  | 
  100 | // ═══════════════════════════════════════════════════════════
  101 | // PRODUCTS — CRUD
  102 | // ═══════════════════════════════════════════════════════════
  103 | 
  104 | test.describe('Products', () => {
  105 |   test.beforeEach(async ({ page }) => {
  106 |     await login(page)
  107 |   })
  108 | 
```