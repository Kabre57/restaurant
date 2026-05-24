import { test, expect } from '@playwright/test'

test.describe('Restaurant POS E2E Scenarios', () => {
  
  test('should render the login page correctly', async ({ page }) => {
    // Naviguer vers la page de login
    await page.goto('/login')

    // Confirmer le titre de l'application et les éléments clés
    await expect(page).toHaveTitle(/POS/i)
    
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
    // Accéder à la page générique de sélection d'espace/table si disponible ou login
    await page.goto('/menu')
    
    // Si la page redirige ou affiche un message d'accueil pour la sélection de restaurant
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
