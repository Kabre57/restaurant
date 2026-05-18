import { expect, test } from '@playwright/test'

test('public menu help page is reachable', async ({ page }) => {
  await page.goto('/menu')
  await expect(page.getByText('Carte/Menu lié à une table')).toBeVisible()
})

test('admin pages require authentication', async ({ page }) => {
  await page.goto('/admin/franchiseurs')
  await expect(page).toHaveURL(/\/login/)
})

test('restaurateur support requires authentication', async ({ page }) => {
  await page.goto('/restaurateur/support')
  await expect(page).toHaveURL(/\/login/)
})
