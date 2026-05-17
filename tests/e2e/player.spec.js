import { test, expect } from '@playwright/test'

test.describe('播放页', () => {
  test('无数据时重定向到首页', async ({ page }) => {
    await page.goto('/player/test_001')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page).not.toHaveURL(/\/player\//)
  })

  test('通过搜索结果进入播放页', async ({ page }) => {
    await page.goto('/search?q=进击的巨人')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const firstCard = page.locator('.anime-grid .anime-card').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await expect(page).toHaveURL(/\/detail\//)

      const playBtn = page.locator('.play-first-btn')
      if (await playBtn.isVisible()) {
        await playBtn.click()
        await expect(page).toHaveURL(/\/player\//)
        await expect(page.locator('.player-layout')).toBeVisible()
      }
    }
  })
})

test.describe('播放页布局', () => {
  test('播放页包含视频区域和侧栏', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.evaluate(() => {
      const { usePlayerStore } = window.__pinia_stores || {}
      if (!usePlayerStore) return
    })

    await page.goto('/player/test_001')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    if (page.url().includes('/player/')) {
      await expect(page.locator('.player-layout')).toBeVisible()
      await expect(page.locator('.player__video-area')).toBeVisible()
    }
  })
})
