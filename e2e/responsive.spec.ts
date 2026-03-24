import { test, expect, devices } from '@playwright/test'

/**
 * Tests responsive behavior on mobile and tablet viewports.
 */
test.describe('Mobile responsiveness', () => {
  test.use({ ...devices['iPhone 13'] })

  test('homepage renders on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DealFlow/i)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('login page is usable on mobile', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()
    await expect(emailInput).toBeVisible()

    // Email input should be wide enough to type in
    const box = await emailInput.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(200)
  })

  test('signup page is usable on mobile', async ({ page }) => {
    await page.goto('/signup')
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()
    await expect(emailInput).toBeVisible()
  })

  test('pricing page shows plans on mobile', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('text=/starter|pro|enterprise/i').first()).toBeVisible()
  })

  test('unauthenticated mobile user redirected from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})

test.describe('Tablet responsiveness', () => {
  test.use({ ...devices['iPad (gen 7)'] })

  test('homepage renders on tablet', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DealFlow/i)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('login page is usable on tablet', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()
    await expect(emailInput).toBeVisible()
  })
})

test.describe('Desktop viewport', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('homepage renders at 1080p', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DealFlow/i)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('no horizontal scrollbar at 1920px', async ({ page }) => {
    await page.goto('/')
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalScroll).toBe(false)
  })
})
