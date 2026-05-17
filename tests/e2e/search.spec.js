import { test, expect } from '@playwright/test'

test.describe('搜索页', () => {
  test('从首页跳转搜索并显示结果', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('.search-input').fill('进击的巨人')
    await page.locator('.search-btn').click()

    await expect(page).toHaveURL(/\/search/)
    await expect(page.locator('.search-input')).toHaveValue('进击的巨人')
  })

  test('搜索页搜索框可输入并搜索', async ({ page }) => {
    await page.goto('/search?q=测试')
    await page.waitForLoadState('networkidle')

    const input = page.locator('.search-input')
    await expect(input).toBeVisible()

    await input.fill('鬼灭之刃')
    await page.locator('.search-submit').click()

    await page.waitForTimeout(500)
    await expect(page.locator('.anime-grid')).toBeVisible()
  })

  test('搜索结果显示动漫卡片', async ({ page }) => {
    await page.goto('/search?q=进击的巨人')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(1000)
    const cards = page.locator('.anime-grid .anime-card')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('点击动漫卡片跳转详情页', async ({ page }) => {
    await page.goto('/search?q=进击的巨人')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(1000)
    const firstCard = page.locator('.anime-grid .anime-card').first()
    await firstCard.click()

    await expect(page).toHaveURL(/\/detail\//)
  })

  test('搜索框清空按钮', async ({ page }) => {
    await page.goto('/search?q=测试')
    await page.waitForLoadState('networkidle')

    const input = page.locator('.search-input')
    await expect(input).toHaveValue('测试')

    await page.locator('.search-clear').click()
    await expect(input).toHaveValue('')
  })

  test('空搜索不触发请求', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const submitBtn = page.locator('.search-submit')
    await expect(submitBtn).toBeDisabled()
  })
})
