# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-qa.spec.ts >> Navigation — All Pages Load >> /settings loads without error
- Location: tests/e2e/full-qa.spec.ts:73:9

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
  12  |   // Wait for redirect to dashboard
  13  |   await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
  14  | }
  15  | 
  16  | test.describe('Authentication', () => {
  17  |   test('login page loads', async ({ page }) => {
  18  |     await page.goto(`${BASE_URL}/login`)
  19  |     await expect(page.locator('text=SG POS')).toBeVisible()
  20  |     await expect(page.locator('input[type="email"]')).toBeVisible()
  21  |     await expect(page.locator('input[type="password"]')).toBeVisible()
  22  |   })
  23  | 
  24  |   test('unauthenticated redirects to login', async ({ page }) => {
  25  |     await page.goto(`${BASE_URL}/pos`)
  26  |     await page.waitForURL('**/login', { timeout: 10000 })
  27  |     expect(page.url()).toContain('/login')
  28  |   })
  29  | 
  30  |   test('login with valid credentials', async ({ page }) => {
  31  |     await login(page)
  32  |     // Should be on dashboard
  33  |     expect(page.url()).toBe(`${BASE_URL}/`)
  34  |     await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 })
  35  |   })
  36  | 
  37  |   test('user info displays after login', async ({ page }) => {
  38  |     await login(page)
  39  |     // Header should show user info
  40  |     await expect(page.locator('text=supachai@siamgreenco.com').or(page.locator('text=Supachai'))).toBeVisible({ timeout: 10000 })
  41  |   })
  42  | })
  43  | 
  44  | test.describe('Navigation — All Pages Load', () => {
  45  |   test.beforeEach(async ({ page }) => {
  46  |     await login(page)
  47  |   })
  48  | 
  49  |   const pages = [
  50  |     { path: '/', title: 'Dashboard' },
  51  |     { path: '/pos', title: 'POS' },
  52  |     { path: '/products', title: 'Products' },
  53  |     { path: '/products/new', title: 'Product' },
  54  |     { path: '/inventory', title: 'Inventory' },
  55  |     { path: '/customers', title: 'Customers' },
  56  |     { path: '/transactions', title: 'Transactions' },
  57  |     { path: '/prescribers', title: 'Prescribers' },
  58  |     { path: '/prescriptions', title: 'Prescriptions' },
  59  |     { path: '/prescriptions/new', title: 'Prescription' },
  60  |     { path: '/purchases', title: 'Purchases' },
  61  |     { path: '/purchases/new', title: 'Purchase' },
  62  |     { path: '/transfers', title: 'Transfers' },
  63  |     { path: '/transfers/new', title: 'Transfer' },
  64  |     { path: '/cash-drawers', title: 'Cash' },
  65  |     { path: '/compliance', title: 'Compliance' },
  66  |     { path: '/analytics', title: 'Analytics' },
  67  |     { path: '/zoho', title: 'Zoho' },
  68  |     { path: '/reconciliation', title: 'Reconciliation' },
  69  |     { path: '/settings', title: 'Settings' },
  70  |   ]
  71  | 
  72  |   for (const { path, title } of pages) {
  73  |     test(`${path} loads without error`, async ({ page }) => {
  74  |       await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' })
  75  |       // Should not show Application error
  76  |       const body = await page.textContent('body')
  77  |       expect(body).not.toContain('Application error')
  78  |       expect(body).not.toContain('Internal Server Error')
  79  |       // Should not be redirected to login (we're authenticated)
  80  |       expect(page.url()).not.toContain('/login')
  81  |     })
  82  |   }
  83  | })
  84  | 
  85  | test.describe('Sidebar Navigation', () => {
  86  |   test.beforeEach(async ({ page }) => {
  87  |     await login(page)
  88  |   })
  89  | 
  90  |   test('sidebar shows all admin nav items', async ({ page }) => {
  91  |     const sidebar = page.locator('aside')
  92  |     await expect(sidebar).toBeVisible()
  93  |     // Check key nav items are visible
  94  |     for (const label of ['Dashboard', 'POS', 'Products', 'Inventory', 'Settings']) {
  95  |       await expect(sidebar.locator(`text=${label}`).first()).toBeVisible()
  96  |     }
  97  |   })
  98  | 
  99  |   test('clicking POS navigates to /pos', async ({ page }) => {
  100 |     await page.locator('aside a[href="/pos"]').click()
  101 |     await page.waitForURL('**/pos', { timeout: 5000 })
  102 |     expect(page.url()).toContain('/pos')
  103 |   })
  104 | })
  105 | 
  106 | test.describe('POS Checkout', () => {
  107 |   test.beforeEach(async ({ page }) => {
  108 |     await login(page)
```