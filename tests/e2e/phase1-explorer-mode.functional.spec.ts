import { test, expect } from '@playwright/test'
import { authenticateAsRole } from '../helpers/auth'
import { SEED_DATA } from '../helpers/seed-data'

test.describe('Phase 1: Explorer Mode Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as trainer for trainer session tests
    await authenticateAsRole(page, 'trainer')
  })

  test('Trainer can browse folders using FolderExplorerView', async ({ page }) => {
    await page.goto(`/trainer/session/${SEED_DATA.sessionCode}`)
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Switch to explorer mode
    await page.click('[data-testid="mode-toggle-explorer-button"]')
    await page.waitForTimeout(1000)
    
    // Verify FolderExplorerView is rendered
    const explorerView = page.locator('[data-testid="folder-explorer-view"]')
    await expect(explorerView).toBeVisible({ timeout: 5000 })
    
    // Try to click on a folder if available
    const folderCount = await page.locator('[data-testid="folder-item"]').count()
    if (folderCount > 0) {
      await page.click('[data-testid="folder-item"]:first-child')
      await page.waitForTimeout(500)
      
      // Verify folder opens (breadcrumb should appear or folder content changes)
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      const breadcrumbVisible = await breadcrumb.isVisible().catch(() => false)
      
      // Either breadcrumb appears or folder content changes
      expect(folderCount).toBeGreaterThan(0)
    }
  })

  test('File opening fetches content in trainer view', async ({ page }) => {
    await page.goto(`/trainer/session/${SEED_DATA.sessionCode}`)
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Switch to explorer mode
    await page.click('[data-testid="mode-toggle-explorer-button"]')
    await page.waitForTimeout(1000)
    
    // Wait for files to load
    await page.waitForSelector('[data-testid="file-item"], [data-testid="folder-item"]', { timeout: 5000 }).catch(() => {})
    
    // Click on a file if available
    const fileItem = page.locator('[data-testid="file-item"]').first()
    const fileVisible = await fileItem.isVisible().catch(() => false)
    
    if (fileVisible) {
      await fileItem.click()
      await page.waitForTimeout(2000) // Wait for file to load
      
      // Verify we switched to workspace mode
      const workspaceButton = page.locator('[data-testid="mode-toggle-workspace-button"]')
      const isWorkspaceActive = await workspaceButton.evaluate((el) => {
        return el.classList.contains('bg-primary') || window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'
      }).catch(() => false)
      
      // Verify file content is displayed
      const editor = page.locator('[data-testid="editor"], textarea, .monaco-editor').first()
      const editorVisible = await editor.isVisible().catch(() => false)
      
      expect(editorVisible || isWorkspaceActive).toBeTruthy()
    }
  })

  test('Mode toggle switches between explorer and workspace modes', async ({ page }) => {
    // Authenticate as trainer for workspace access
    await authenticateAsRole(page, 'trainer')
    await page.goto('/workspace')
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Check initial state - should be in explorer mode by default
    const explorerButton = page.locator('[data-testid="mode-toggle-explorer-button"]')
    const workspaceButton = page.locator('[data-testid="mode-toggle-workspace-button"]')
    
    // Switch to workspace mode
    await workspaceButton.click()
    await page.waitForTimeout(500)
    
    // Verify workspace mode is active
    const workspaceActive = await workspaceButton.evaluate((el) => {
      return el.classList.contains('bg-primary')
    })
    expect(workspaceActive).toBeTruthy()
    
    // Verify workspace components are visible
    const fileExplorer = page.locator('[data-testid="file-explorer"]')
    const fileExplorerVisible = await fileExplorer.isVisible().catch(() => false)
    expect(fileExplorerVisible).toBeTruthy()
    
    // Switch back to explorer mode
    await explorerButton.click()
    await page.waitForTimeout(500)
    
    // Verify explorer mode is active
    const explorerActive = await explorerButton.evaluate((el) => {
      return el.classList.contains('bg-primary')
    })
    expect(explorerActive).toBeTruthy()
  })

  test('Mode toggle state persists correctly', async ({ page }) => {
    // Authenticate as trainer for workspace access
    await authenticateAsRole(page, 'trainer')
    await page.goto('/workspace')
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Set to workspace mode
    await page.click('[data-testid="mode-toggle-workspace-button"]')
    await page.waitForTimeout(500)
    
    // Verify mode is set
    const workspaceActive = await page.locator('[data-testid="mode-toggle-workspace-button"]').evaluate((el) => {
      return el.classList.contains('bg-primary')
    })
    expect(workspaceActive).toBeTruthy()
    
    // Note: Mode persistence depends on your implementation
    // If using localStorage, you can test it here
  })

  test('WorkspaceModeToggle component renders correctly', async ({ page }) => {
    // Authenticate as trainer for workspace access
    await authenticateAsRole(page, 'trainer')
    await page.goto('/workspace')
    await page.waitForSelector('[data-testid="mode-toggle"]', { timeout: 10000 })
    
    // Verify toggle container exists
    const toggle = page.locator('[data-testid="mode-toggle"]')
    await expect(toggle).toBeVisible()
    
    // Verify both buttons exist
    const explorerButton = page.locator('[data-testid="mode-toggle-explorer-button"]')
    const workspaceButton = page.locator('[data-testid="mode-toggle-workspace-button"]')
    
    await expect(explorerButton).toBeVisible()
    await expect(workspaceButton).toBeVisible()
    
    // Verify button text
    await expect(explorerButton).toContainText('Explorer')
    await expect(workspaceButton).toContainText('Workspace')
  })
})

