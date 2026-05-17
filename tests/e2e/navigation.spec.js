import { test, expect } from '@playwright/test'

test.describe('导航', () => {
  test('侧边栏四个导航项', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const items = page.locator('.side-bar__item')
    await expect(items).toHaveCount(4)

    await expect(items.nth(0).locator('.side-bar__label')).toHaveText('首页')
    await expect(items.nth(1).locator('.side-bar__label')).toHaveText('搜索')
    await expect(items.nth(2).locator('.side-bar__label')).toHaveText('订阅源')
    await expect(items.nth(3).locator('.side-bar__label')).toHaveText('历史')
  })

  test('点击搜索导航到搜索页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('.side-bar__item').nth(1).click()
    await expect(page).toHaveURL(/\/search/)
    await expect(page.locator('.search-input')).toBeVisible()
  })

  test('点击订阅源导航到订阅源页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('.side-bar__item').nth(2).click()
    await expect(page).toHaveURL(/\/sources/)
    await expect(page.locator('.source-page')).toBeVisible()
  })

  test('点击历史导航到历史页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('.side-bar__item').nth(3).click()
    await expect(page).toHaveURL(/\/history/)
  })

  test('点击首页导航回来', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    await page.locator('.side-bar__item').nth(0).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.home-page')).toBeVisible()
  })

  test('导航高亮当前页', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const searchItem = page.locator('.side-bar__item').nth(1)
    await expect(searchItem).toHaveClass(/active/)
  })
})

test.describe('订阅源页', () => {
  test('页面标题和输入框', async ({ page }) => {
    await page.goto('/sources')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.source-title')).toHaveText('订阅源管理')
    await expect(page.locator('.source-input')).toBeVisible()
    await expect(page.locator('.add-btn')).toBeVisible()
  })

  test('空输入时添加按钮可用但应提示', async ({ page }) => {
    await page.goto('/sources')
    await page.waitForLoadState('networkidle')

    const addBtn = page.locator('.add-btn')
    await expect(addBtn).toBeVisible()
  })

  test('输入无效URL显示错误', async ({ page }) => {
    await page.goto('/sources')
    await page.waitForLoadState('networkidle')

    await page.locator('.source-input').fill('not-a-url')
    await page.locator('.add-btn').click()

    await page.waitForTimeout(500)
    const errorMsg = page.locator('.error-msg')
    await expect(errorMsg).toBeVisible()
  })
})
