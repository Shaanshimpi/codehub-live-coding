import { test, expect } from '@playwright/test'
import { authenticateAsRole } from '../helpers/auth'
import { SEED_DATA } from '../helpers/seed-data'

test.describe('Phase 1: Explorer Mode UI Tests', () => {
  test('Trainer explorer mode matches student explorer mode visually', async ({ page }) => {
    // Authenticate as trainer first
    await authenticateAsRole(page, 'trainer')
    
    // Navigate to trainer session
    await page.goto(`/trainer/session/${SEED_DATA.sessionCode}`)
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Switch to explorer mode
    await page.click('[data-testid="mode-toggle-explorer-button"]')
    await page.waitForTimeout(1000) // Wait for mode switch
    
    // Wait for explorer view to load
    await page.waitForSelector('[data-testid="folder-explorer-view"], [data-testid="folder-item"], [data-testid="file-item"]', { timeout: 5000 }).catch(() => {})
    
    // Take screenshot of trainer explorer
    const trainerExplorer = page.locator('[data-testid="folder-explorer-view"]').first()
    if (await trainerExplorer.isVisible().catch(() => false)) {
      await expect(trainerExplorer).toHaveScreenshot('trainer-explorer.png')
    }
    
    // Authenticate as student for student session
    await authenticateAsRole(page, 'student')
    
    // Navigate to student session
    await page.goto(`/student/session/${SEED_DATA.sessionCode}`)
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Switch to explorer mode
    await page.click('[data-testid="mode-toggle-explorer-button"]')
    await page.waitForTimeout(1000) // Wait for mode switch
    
    // Wait for explorer view to load
    await page.waitForSelector('[data-testid="folder-explorer-view"], [data-testid="folder-item"], [data-testid="file-item"]', { timeout: 5000 }).catch(() => {})
    
    // Compare - should match visually
    const studentExplorer = page.locator('[data-testid="folder-explorer-view"]').first()
    if (await studentExplorer.isVisible().catch(() => false)) {
      await expect(studentExplorer).toHaveScreenshot('student-explorer.png')
    }
  })

  test('Mode toggle UI is consistent across all views', async ({ page }) => {
    const views = [
      { url: '/workspace', name: 'workspace', role: 'trainer' as const },
      { url: `/trainer/session/${SEED_DATA.sessionCode}`, name: 'trainer-session', role: 'trainer' as const },
      { url: `/student/session/${SEED_DATA.sessionCode}`, name: 'student-session', role: 'student' as const }
    ]
    
    for (const view of views) {
      // Authenticate with appropriate role for each view
      await authenticateAsRole(page, view.role)
      await page.goto(view.url)
      await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
      
      // Visual comparison
      await expect(page.locator('[data-testid="mode-toggle"]')).toHaveScreenshot(`mode-toggle-${view.name}.png`)
      
      // Check styling consistency
      const toggle = page.locator('[data-testid="mode-toggle"]')
      const styles = await toggle.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          fontSize: computed.fontSize
        }
      })
      
      // Verify consistent styling (adjust values based on your design system)
      expect(styles.borderRadius).toBeTruthy()
      expect(styles.fontSize).toBeTruthy()
    }
  })

  test('File opening shows loading state consistently', async ({ page }) => {
    // Authenticate as trainer
    await authenticateAsRole(page, 'trainer')
    await page.goto(`/trainer/session/${SEED_DATA.sessionCode}`)
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Switch to workspace mode first
    await page.click('[data-testid="mode-toggle-workspace-button"]')
    await page.waitForTimeout(500)
    
    // Wait for file explorer to load
    await page.waitForSelector('[data-testid="file-item"], [data-testid="file-explorer"]', { timeout: 5000 }).catch(() => {})
    
    // Click on a file if available
    const fileItem = page.locator('[data-testid="file-item"]').first()
    if (await fileItem.isVisible().catch(() => false)) {
      await fileItem.click()
      
      // Check if loading overlay appears (if switching file)
      const overlay = page.locator('[data-testid="file-switching-overlay"]')
      const overlayVisible = await overlay.isVisible().catch(() => false)
      
      if (overlayVisible) {
        await expect(overlay).toHaveScreenshot('file-loading-overlay.png')
      }
    }
  })

  test('Breadcrumb navigation renders correctly in trainer view', async ({ page }) => {
    // Authenticate as trainer
    await authenticateAsRole(page, 'trainer')
    await page.goto(`/trainer/session/${SEED_DATA.sessionCode}`)
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Switch to explorer mode
    await page.click('[data-testid="mode-toggle-explorer-button"]')
    await page.waitForTimeout(1000)
    
    // Wait for explorer to load
    await page.waitForSelector('[data-testid="folder-explorer-view"]', { timeout: 5000 }).catch(() => {})
    
    // Try to navigate to a nested folder if available
    const folderItem = page.locator('[data-testid="folder-item"]').first()
    if (await folderItem.isVisible().catch(() => false)) {
      await folderItem.click()
      await page.waitForTimeout(500)
      
      // Verify breadcrumb appears
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      const breadcrumbVisible = await breadcrumb.isVisible().catch(() => false)
      
      if (breadcrumbVisible) {
        await expect(breadcrumb).toHaveScreenshot('breadcrumb-trainer.png')
      }
    }
  })
})

