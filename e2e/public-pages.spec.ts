import { test, expect } from '@playwright/test'

test.describe('Public pages load without errors', () => {
  test('homepage renders hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DealFlow/i)
    // Hero section should be visible
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('login page renders form', async ({ page }) => {
    await page.goto('/login')
    // Should have email input and submit button
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible()
  })

  test('signup page renders form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible()
  })

  test('pricing page renders plans', async ({ page }) => {
    await page.goto('/pricing')
    // Should show pricing tiers
    await expect(page.locator('text=/starter|pro|enterprise/i').first()).toBeVisible()
  })

  test('about page loads', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('homepage nav links work', async ({ page }) => {
    await page.goto('/')

    // Check that key navigation links exist
    const nav = page.locator('nav, header')
    await expect(nav.first()).toBeVisible()
  })

  test('login link navigates to login page', async ({ page }) => {
    await page.goto('/')

    const loginLink = page.locator('a[href="/login"], a:has-text("Log in"), a:has-text("Sign in")').first()
    if (await loginLink.isVisible()) {
      await loginLink.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
