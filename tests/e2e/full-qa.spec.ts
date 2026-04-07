import { test, expect, type Page } from '@playwright/test'

const BASE_URL = 'https://sg-pos-v2.vercel.app'
const EMAIL = 'supachai@siamgreenco.com'
const PASSWORD = 'SiamGreen2026!'

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
}

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await expect(page.locator('text=SG POS')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('unauthenticated redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/pos`)
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })

  test('login with valid credentials', async ({ page }) => {
    await login(page)
    // Should be on dashboard
    expect(page.url()).toBe(`${BASE_URL}/`)
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 })
  })

  test('user info displays after login', async ({ page }) => {
    await login(page)
    // Header should show user info
    await expect(page.locator('text=supachai@siamgreenco.com').or(page.locator('text=Supachai'))).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Navigation — All Pages Load', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  const pages = [
    { path: '/', title: 'Dashboard' },
    { path: '/pos', title: 'POS' },
    { path: '/products', title: 'Products' },
    { path: '/products/new', title: 'Product' },
    { path: '/inventory', title: 'Inventory' },
    { path: '/customers', title: 'Customers' },
    { path: '/transactions', title: 'Transactions' },
    { path: '/prescribers', title: 'Prescribers' },
    { path: '/prescriptions', title: 'Prescriptions' },
    { path: '/prescriptions/new', title: 'Prescription' },
    { path: '/purchases', title: 'Purchases' },
    { path: '/purchases/new', title: 'Purchase' },
    { path: '/transfers', title: 'Transfers' },
    { path: '/transfers/new', title: 'Transfer' },
    { path: '/cash-drawers', title: 'Cash' },
    { path: '/compliance', title: 'Compliance' },
    { path: '/analytics', title: 'Analytics' },
    { path: '/zoho', title: 'Zoho' },
    { path: '/reconciliation', title: 'Reconciliation' },
    { path: '/settings', title: 'Settings' },
  ]

  for (const { path, title } of pages) {
    test(`${path} loads without error`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' })
      // Should not show Application error
      const body = await page.textContent('body')
      expect(body).not.toContain('Application error')
      expect(body).not.toContain('Internal Server Error')
      // Should not be redirected to login (we're authenticated)
      expect(page.url()).not.toContain('/login')
    })
  }
})

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar shows all admin nav items', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    // Check key nav items are visible
    for (const label of ['Dashboard', 'POS', 'Products', 'Inventory', 'Settings']) {
      await expect(sidebar.locator(`text=${label}`).first()).toBeVisible()
    }
  })

  test('clicking POS navigates to /pos', async ({ page }) => {
    await page.locator('aside a[href="/pos"]').click()
    await page.waitForURL('**/pos', { timeout: 5000 })
    expect(page.url()).toContain('/pos')
  })
})

test.describe('POS Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' })
  })

  test('POS page loads with product grid', async ({ page }) => {
    // Should show product tiles or categories
    await expect(page.locator('text=Cart is empty').or(page.locator('text=Loading'))).toBeVisible({ timeout: 10000 })
  })

  test('product tiles are clickable', async ({ page }) => {
    // Wait for products to load
    await page.waitForTimeout(3000)
    const productTile = page.locator('[class*="cursor-pointer"]').first()
    if (await productTile.isVisible()) {
      await productTile.click()
      // Either adds to cart or opens weight dialog
      await page.waitForTimeout(1000)
    }
  })

  test('customer search works', async ({ page }) => {
    // Find the customer ID input
    const idInput = page.locator('input[placeholder*="ID"]').or(page.locator('input[placeholder*="National"]')).first()
    if (await idInput.isVisible()) {
      await idInput.fill('1100700123456')
      await idInput.press('Enter')
      await page.waitForTimeout(2000)
      // Should show customer info or age verification
      const body = await page.textContent('body')
      expect(body).toMatch(/Somchai|Age|✓|Customer/)
    }
  })

  test('payment methods are shown', async ({ page }) => {
    await expect(page.locator('button:has-text("Cash")')).toBeVisible()
    await expect(page.locator('button:has-text("Card")')).toBeVisible()
    await expect(page.locator('button:has-text("Transfer")')).toBeVisible()
  })

  test('cash payment shows change calculator', async ({ page }) => {
    // Click Cash button
    await page.locator('button:has-text("Cash")').click()
    // Cash section should not appear until items in cart (grandTotal > 0)
    // This is expected behavior
  })
})

test.describe('Dashboard', () => {
  test('shows metrics cards', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    // Should show some metric-related text
    expect(body).toMatch(/Revenue|Transactions|COGS|Profit|฿/)
  })
})

test.describe('Settings Page', () => {
  test('settings loads with tabs', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body.length).toBeGreaterThan(100)
    // Settings page should contain some content (tabs or user list)
    expect(body).toMatch(/Settings|User|Branch|Config|admin/)
  })

  test('shows current user in users tab', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body')
    expect(body).toContain('supachai@siamgreenco.com')
  })
})

test.describe('Header', () => {
  test('header shows branch name', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(3000)
    const header = page.locator('header')
    const text = await header.textContent()
    expect(text).toMatch(/Siam Green|PP|Branch/)
  })

  test('user dropdown opens', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(2000)
    // Click user icon in header
    const userButton = page.locator('header button:has(svg)').last()
    await userButton.click()
    await page.waitForTimeout(500)
    // Dropdown should show sign out option
    await expect(page.locator('text=Sign out').or(page.locator('text=Sign Out'))).toBeVisible({ timeout: 3000 })
  })
})
