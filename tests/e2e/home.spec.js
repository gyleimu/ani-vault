import { test, expect } from '@playwright/test'

test.describe('首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('页面标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/AniVault/)
  })

  test('显示搜索输入框', async ({ page }) => {
    const input = page.locator('.search-input')
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute('placeholder', '搜索动漫...')
  })

  test('显示热门标签', async ({ page }) => {
    const tags = page.locator('.hot-tag')
    await expect(tags).toHaveCount(5)
    await expect(tags.nth(0)).toHaveText('# 热血')
    await expect(tags.nth(1)).toHaveText('# 治愈')
  })

  test('输入关键词按回车跳转搜索页', async ({ page }) => {
    const input = page.locator('.search-input')
    await input.fill('进击的巨人')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=.*/)
  })

  test('点击搜索按钮跳转搜索页', async ({ page }) => {
    const input = page.locator('.search-input')
    await input.fill('鬼灭之刃')
    await page.locator('.search-btn').click()
    await expect(page).toHaveURL(/\/search\?q=.*/)
  })

  test('点击热门标签跳转搜索页', async ({ page }) => {
    await page.locator('.hot-tag').first().click()
    await expect(page).toHaveURL(/\/search\?q=/)
  })

  test('搜索框为空时不跳转', async ({ page }) => {
    await page.locator('.search-btn').click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('侧边栏导航存在', async ({ page }) => {
    const sidebar = page.locator('.side-bar')
    await expect(sidebar).toBeVisible()
    const items = page.locator('.side-bar__item')
    await expect(items).toHaveCount(4)
  })
})
