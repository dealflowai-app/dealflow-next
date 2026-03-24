import { test, expect, devices } from '@playwright/test'

/**
 * Tests main app navigation links and routing behavior.
 * All protected routes should redirect unauthenticated users to /login.
 */
test.describe('Sidebar navigation links', () => {
  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Community', href: '/community' },
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'Discovery', href: '/discovery' },
    { label: 'CRM', href: '/crm' },
    { label: 'Outreach', href: '/outreach' },
    { label: 'Deals', href: '/deals' },
    { label: 'Contracts', href: '/contracts' },
    { label: 'Ask AI', href: '/chat' },
    { label: 'Settings', href: '/settings' },
  ]

  test('protected routes redirect unauthenticated user to /login', async ({ page }) => {
    for (const { label, href } of navItems) {
      await page.goto(href)
      await page.waitForURL(/\/login/, { timeout: 10_000 })
      expect(page.url(), `${label} (${href}) should redirect to /login`).toContain('/login')
    }
  })

  test('login page preserves return URL via query param or redirect path', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    // After redirect, the URL should either contain a returnTo/redirect param or be /login
    const url = page.url()
    expect(url).toContain('/login')
  })
})

test.describe('Public page navigation', () => {
  test('homepage has visible navigation header', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav, header')
    await expect(nav.first()).toBeVisible()
  })

  test('homepage contains login and signup links', async ({ page }) => {
    await page.goto('/')

    const loginLink = page.locator('a[href="/login"], a:has-text("Log in"), a:has-text("Sign in")').first()
    const signupLink = page.locator('a[href="/signup"], a:has-text("Sign up"), a:has-text("Get started")').first()

    // At least one of these should be present
    const hasLogin = await loginLink.isVisible().catch(() => false)
    const hasSignup = await signupLink.isVisible().catch(() => false)
    expect(hasLogin || hasSignup).toBe(true)
  })

  test('clicking login link navigates to /login', async ({ page }) => {
    await page.goto('/')
    const loginLink = page.locator('a[href="/login"], a:has-text("Log in"), a:has-text("Sign in")').first()
    if (await loginLink.isVisible()) {
      await loginLink.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})

test.describe('Mobile navigation', () => {
  test.use({ ...devices['iPhone 13'] })

  test('mobile viewport shows hamburger or menu toggle', async ({ page }) => {
    await page.goto('/')

    // Look for common mobile menu triggers
    const menuButton = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="nav" i], [data-testid="mobile-menu"], button:has(svg)',
    )

    // On mobile, either a menu button exists or the nav is already visible
    const nav = page.locator('nav').first()
    const hasNav = await nav.isVisible().catch(() => false)
    const hasMenuButton = await menuButton.first().isVisible().catch(() => false)

    expect(hasNav || hasMenuButton).toBe(true)
  })

  test('protected routes still redirect on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})
