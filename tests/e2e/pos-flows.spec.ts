import { test, expect } from '@playwright/test'

test.describe('Restaurant POS E2E Scenarios', () => {
  
  test('should render the login page correctly', async ({ page }) => {
    // Naviguer vers la page de login
    await page.goto('/login')

    // Confirmer le titre de l'application et les éléments clés
    await expect(page).toHaveTitle(/Parabellum/i)
    
    // Vérifier la présence du formulaire de connexion
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
  })

  test('should display premium styling elements on login page', async ({ page }) => {
    await page.goto('/login')

    // Vérifier les éléments de design premium comme le logo ou les messages d'accueil
    const welcomeHeading = page.locator('h1')
    await expect(welcomeHeading).toBeVisible()

    // Vérifier que le bouton contient bien un texte approprié
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toContainText(/se connecter/i)
  })

  test('should correctly render self-service restaurant menu page', async ({ page }) => {
    await page.goto('/menu')
    
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should redirect unauthenticated users to login for protected routes', async ({ page }) => {
    // Augmenter le timeout car le serveur de dev Next.js compile les pages à la volée
    test.setTimeout(60000)

    // Route cashier protégée
    await page.goto('/cashier')
    await page.waitForURL('**/login**')
    expect(page.url()).toContain('/login')

    // Route serveur protégée
    await page.goto('/serveur')
    await page.waitForURL('**/login**')
    expect(page.url()).toContain('/login')

    // Route KDS protégée
    await page.goto('/kds')
    await page.waitForURL('**/login**')
    expect(page.url()).toContain('/login')

    // Route restaurateur protégée
    await page.goto('/restaurateur')
    await page.waitForURL('**/login**')
    expect(page.url()).toContain('/login')
  })
})
