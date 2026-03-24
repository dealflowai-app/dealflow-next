import { test, expect } from '@playwright/test'

test.describe('Auth redirects', () => {
  test('unauthenticated user visiting /dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated user visiting /deals is redirected to /login', async ({ page }) => {
    await page.goto('/deals')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated user visiting /discovery is redirected to /login', async ({ page }) => {
    await page.goto('/discovery')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated user visiting /settings is redirected to /login', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated user visiting /crm is redirected to /login', async ({ page }) => {
    await page.goto('/crm')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})
