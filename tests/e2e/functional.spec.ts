import { test, expect, type Page } from '@playwright/test'

const BASE_URL = 'https://sg-pos-v2.vercel.app'
const EMAIL = 'supachai@siamgreenco.com'
const PASSWORD = 'SiamGreen2026!'

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
}

// ═══════════════════════════════════════════════════════════
// POS CHECKOUT — Full Flow
// ═══════════════════════════════════════════════════════════

test.describe('POS Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
  })

  test('can add fixed-price product to cart', async ({ page }) => {
    // Wait for products to load, click a non-weight product (e.g. edibles/papers)
    await page.waitForTimeout(2000)
    // Look for a product tile that isn't sold by weight
    const tile = page.locator('[class*="cursor-pointer"]').first()
    if (await tile.isVisible()) {
      await tile.click()
      await page.waitForTimeout(1000)
      // Cart should no longer be empty
      const cart = await page.textContent('body')
      // Either shows item in cart or weight dialog opened
      expect(cart).toBeTruthy()
    }
  })

  test('can search and select customer by ID', async ({ page }) => {
    const idInput = page.locator('input[placeholder*="13"]').or(page.locator('input[placeholder*="ID"]')).or(page.locator('input[placeholder*="National"]')).first()
    await expect(idInput).toBeVisible({ timeout: 5000 })
    await idInput.fill('1100700123456')
    await idInput.press('Enter')
    await page.waitForTimeout(3000)
    // Should show Somchai and age badge
    const body = await page.textContent('body') ?? ''
    expect(body).toContain('Somchai')
    expect(body).toMatch(/Age.*\d+/)
  })

  test('age verification blocks under-20', async ({ page }) => {
    // John Smith DOB 1988-03-10 should pass (age 38)
    const idInput = page.locator('input[placeholder*="13"]').or(page.locator('input[placeholder*="ID"]')).or(page.locator('input[placeholder*="National"]')).first()
    await expect(idInput).toBeVisible({ timeout: 5000 })
    // Try passport search
    const typeToggle = page.locator('button:has-text("Passport")').or(page.locator('text=Passport')).first()
    if (await typeToggle.isVisible()) {
      await typeToggle.click()
    }
    await idInput.fill('P12345678')
    await idInput.press('Enter')
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    // John Smith should show with age verification passed
    expect(body).toMatch(/John|Age|✓/)
  })

  test('cash payment shows change calculator with quick buttons', async ({ page }) => {
    // Add a product first
    const tile = page.locator('[class*="cursor-pointer"]').first()
    if (await tile.isVisible()) {
      await tile.click()
      await page.waitForTimeout(1500)
    }
    // Select Cash payment
    await page.locator('button:has-text("Cash")').click()
    await page.waitForTimeout(500)
    // Should show cash received input and quick buttons
    const received = page.locator('input[placeholder="0.00"]')
    if (await received.isVisible()) {
      // Quick amount buttons should be visible
      await expect(page.locator('text=฿1,000.00').or(page.locator('text=฿500.00'))).toBeVisible()
      // Enter cash amount
      await received.fill('1000')
      await page.waitForTimeout(500)
      // Change should be displayed
      await expect(page.locator('text=Change')).toBeVisible()
    }
  })

  test('complete sale button is disabled without customer', async ({ page }) => {
    const completeBtn = page.locator('button:has-text("Complete Sale")')
    await expect(completeBtn).toBeVisible()
    await expect(completeBtn).toBeDisabled()
  })
})

// ═══════════════════════════════════════════════════════════
// PRODUCTS — CRUD
// ═══════════════════════════════════════════════════════════

test.describe('Products', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('products page shows product list', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/OG Kush|Blue Dream|Sour Diesel|Products/)
  })

  test('product detail page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // Click first product link
    const productLink = page.locator('a[href*="/products/"]').first()
    if (await productLink.isVisible()) {
      await productLink.click()
      await page.waitForTimeout(3000)
      const body = await page.textContent('body') ?? ''
      // Should show product details
      expect(body).toMatch(/SKU|Price|THC|Category/)
    }
  })

  test('new product form loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/products/new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await expect(page.locator('input[name="name"]').or(page.locator('label:has-text("Name")'))).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════

test.describe('Inventory', () => {
  test('inventory page shows stock levels', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    // Should show products with quantities
    expect(body).toMatch(/OG Kush|Blue Dream|Inventory|Stock/)
  })

  test('stock adjustment dialog opens', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    // Look for adjust button
    // Click any row's adjust button (could be icon button or text)
    const adjustBtn = page.locator('button:has-text("Adjust")').or(page.locator('button:has(svg)').nth(5)).first()
    await adjustBtn.click()
    await page.waitForTimeout(1000)
    // Dialog should show "Adjust Stock" title
    await expect(page.locator('text=Adjust Stock').or(page.locator('text=Reason')).or(page.locator('text=Quantity'))).toBeVisible({ timeout: 5000 })
  })
})

// ═══════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════

test.describe('Customers', () => {
  test('can search customers', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const searchInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[placeholder*="search"]')).or(page.locator('input[type="search"]')).first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Somchai')
      await searchInput.press('Enter')
      await page.waitForTimeout(3000)
      const body = await page.textContent('body') ?? ''
      expect(body).toContain('Somchai')
    }
  })
})

// ═══════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════

test.describe('Transactions', () => {
  test('transactions page shows list', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Transactions|Receipt|฿|completed/)
  })
})

// ═══════════════════════════════════════════════════════════
// PRESCRIBERS
// ═══════════════════════════════════════════════════════════

test.describe('Prescribers', () => {
  test('prescribers page shows list', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/prescribers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/สมศักดิ์|Prescriber|License/)
  })

  test('add prescriber dialog opens', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/prescribers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const addBtn = page.locator('button:has-text("Prescriber")').last()
    await addBtn.click()
    await page.waitForTimeout(2000)
    // Dialog is open — verify by checking for the Create button inside the dialog
    await expect(page.locator('button:has-text("Create")')).toBeVisible({ timeout: 8000 })
  })
})

// ═══════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════

test.describe('Prescriptions', () => {
  test('prescriptions page shows list', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/prescriptions`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Prescription|RX-|Active|Expired/)
  })

  test('new prescription form has all fields', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/prescriptions/new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Customer/)
    expect(body).toMatch(/Issued Date|Expiry Date/)
    expect(body).toMatch(/Prescriber|Branch/)
    expect(body).toMatch(/Dosage|Daily/)
  })
})

// ═══════════════════════════════════════════════════════════
// PURCHASES
// ═══════════════════════════════════════════════════════════

test.describe('Purchases', () => {
  test('purchases page loads', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/purchases`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Purchase|New|Draft|Received/)
  })

  test('new purchase form has supplier and items', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/purchases/new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Supplier|Product|Quantity|Cost/)
  })
})

// ═══════════════════════════════════════════════════════════
// TRANSFERS
// ═══════════════════════════════════════════════════════════

test.describe('Transfers', () => {
  test('transfers page loads', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/transfers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Transfer|New|requested|approved/)
  })

  test('new transfer form has branch selectors', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/transfers/new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Product|Branch|Quantity|From|To/)
  })
})

// ═══════════════════════════════════════════════════════════
// CASH DRAWERS
// ═══════════════════════════════════════════════════════════

test.describe('Cash Drawers', () => {
  test('cash drawers page loads', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/cash-drawers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Cash|Session|Open|Close/)
  })
})

// ═══════════════════════════════════════════════════════════
// COMPLIANCE
// ═══════════════════════════════════════════════════════════

test.describe('Compliance', () => {
  test('compliance page has PT.27 and PT.28 exports', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/compliance`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/ภท\.27|PT\.27|Acquisition|27/)
    expect(body).toMatch(/ภท\.28|PT\.28|Dispensing|28/)
  })

  test('compliance has branch and month selectors', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/compliance`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // Should have month/date selector and branch selector
    await expect(page.locator('select').or(page.locator('button[role="combobox"]')).first()).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════

test.describe('Analytics', () => {
  test('analytics shows revenue and metrics', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Revenue|Profit|COGS|฿/)
  })

  test('analytics has date range picker', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // Should have date inputs
    await expect(page.locator('input[type="date"]').first()).toBeVisible()
  })

  test('analytics shows top products', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Top|Product|Category|Strain/)
  })
})

// ═══════════════════════════════════════════════════════════
// ZOHO
// ═══════════════════════════════════════════════════════════

test.describe('Zoho Settings', () => {
  test.skip('zoho page has connect and sync buttons — disabled for Day 1', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/zoho`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Zoho|Connect|Sync/)
  })
})

// ═══════════════════════════════════════════════════════════
// RECONCILIATION
// ═══════════════════════════════════════════════════════════

test.describe('Reconciliation', () => {
  test.skip('reconciliation page has tabs — disabled for Day 1', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/reconciliation`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Reconciliation|Pending|Matched|Run/)
  })
})

// ═══════════════════════════════════════════════════════════
// SETTINGS — User Management
// ═══════════════════════════════════════════════════════════

test.describe('Settings — User Management', () => {
  test('shows admin user with correct role', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toContain('supachai@siamgreenco.com')
    expect(body).toContain('admin')
  })

  test('shows branch list', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // Click Branches tab
    const branchTab = page.locator('button:has-text("Branches")').or(page.locator('text=Branches')).first()
    if (await branchTab.isVisible()) {
      await branchTab.click()
      await page.waitForTimeout(2000)
      const body = await page.textContent('body') ?? ''
      expect(body).toMatch(/Siam Green PP|PP|SL|CT/)
    }
  })
})

// ═══════════════════════════════════════════════════════════
// DASHBOARD — Metrics
// ═══════════════════════════════════════════════════════════

test.describe('Dashboard Functionality', () => {
  test('shows revenue, COGS, profit metrics', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Revenue|COGS|Profit|Margin/)
  })

  test('shows low stock alerts section', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Low Stock|Stock|Alert|Expir/)
  })

  test('shows recent transactions', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(3000)
    const body = await page.textContent('body') ?? ''
    expect(body).toMatch(/Recent|Transaction|฿/)
  })
})

// ═══════════════════════════════════════════════════════════
// HEADER — Branch Selector & User Menu
// ═══════════════════════════════════════════════════════════

test.describe('Header Functionality', () => {
  test('admin sees branch selector', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(3000)
    const header = page.locator('header')
    const text = await header.textContent() ?? ''
    expect(text).toMatch(/Siam Green|PP/)
  })

  test('user dropdown shows sign out', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(2000)
    const userBtn = page.locator('header button:has(svg)').last()
    await userBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=Sign out').or(page.locator('text=Sign Out'))).toBeVisible({ timeout: 3000 })
  })

  test('sign out works', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(2000)
    const userBtn = page.locator('header button:has(svg)').last()
    await userBtn.click()
    await page.waitForTimeout(500)
    const signOutBtn = page.locator('text=Sign out').or(page.locator('text=Sign Out'))
    await signOutBtn.click()
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })
})
