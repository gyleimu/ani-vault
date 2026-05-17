import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))

vi.mock('../../src/api/sources.js', () => ({
  getActiveSource: vi.fn()
}))

vi.mock('../../src/api/adapters/cms.js', () => ({
  search: vi.fn(),
  detail: vi.fn(),
  list: vi.fn(),
  parsePlayUrl: vi.fn()
}))

vi.mock('../../src/api/adapters/appys.js', () => ({
  search: vi.fn(),
  detail: vi.fn(),
  list: vi.fn()
}))

vi.mock('../../src/api/engine-client.js', () => ({
  pluginSearch: vi.fn(),
  pluginDetail: vi.fn(),
  pluginList: vi.fn(),
  pluginPlay: vi.fn(),
  registerScript: vi.fn(),
  registerInline: vi.fn(),
  isEngineReady: vi.fn(() => true),
  startEngine: vi.fn(() => Promise.resolve(true))
}))

import { searchAnime, getAnimeDetail, getAnimeList, parsePlayUrl } from '../../src/api/source-client.js'
import { getActiveSource } from '../../src/api/sources.js'
import * as cms from '../../src/api/adapters/cms.js'
import * as appys from '../../src/api/adapters/appys.js'
import * as engine from '../../src/api/engine-client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('searchAnime', () => {
  it('搜索请求使用 ac=list', async () => {
    getActiveSource.mockReturnValue({
      api: 'https://api.test.com/api.php/provide/vod',
      sourceType: 'cms'
    })
    cms.search.mockResolvedValue({
      list: [{ vod_id: '1', vod_name: '测试动漫' }],
      page: 1,
      pagecount: 1,
      total: 1
    })

    const result = await searchAnime('测试')
    expect(cms.search).toHaveBeenCalledWith('https://api.test.com/api.php/provide/vod', '测试')
    expect(result.list).toHaveLength(1)
    expect(result.list[0].vod_name).toBe('测试动漫')
  })

  it('API URL 去除尾部斜杠', async () => {
    getActiveSource.mockReturnValue({
      api: 'https://api.test.com/api.php/provide/vod/',
      sourceType: 'cms'
    })
    cms.search.mockResolvedValue({ list: [], page: 1, pagecount: 0, total: 0 })

    await searchAnime('test')
    expect(cms.search).toHaveBeenCalledWith('https://api.test.com/api.php/provide/vod/', 'test')
  })

  it('AppYs源通过 appys 适配器搜索', async () => {
    getActiveSource.mockReturnValue({
      api: 'https://example.com/api.php/v1.vod',
      sourceType: 'appys'
    })
    appys.search.mockResolvedValue({
      list: [{ vod_id: '1', vod_name: 'AppYs结果' }],
      page: 1,
      pagecount: 1,
      total: 1
    })

    const result = await searchAnime('测试')
    expect(appys.search).toHaveBeenCalledWith('https://example.com/api.php/v1.vod', '测试')
    expect(result.list[0].vod_name).toBe('AppYs结果')
  })

  it('插件源通过 engine 搜索并归一化', async () => {
    getActiveSource.mockReturnValue({
      api: 'csp_xpath',
      sourceType: 'plugin',
      cspModule: 'xpath',
      name: 'XPath源',
      ext: 'https://example.com/xpath.js'
    })
    engine.pluginSearch.mockResolvedValue({
      list: [{ vod_id: '1', vod_name: '插件结果', vod_pic: 'http://img.jpg', vod_remarks: '更新中' }],
      page: 1,
      pagecount: 1,
      total: 1
    })

    const result = await searchAnime('测试')
    expect(engine.pluginSearch).toHaveBeenCalledWith('xpath', '测试')
    expect(result.list[0].title).toBe('插件结果')
    expect(result.list[0].id).toBe('1')
    expect(result.list[0].cover).toBe('http://img.jpg')
    expect(result.list[0].remarks).toBe('更新中')
  })
})

describe('getAnimeDetail', () => {
  it('通过 cms 适配器获取详情', async () => {
    getActiveSource.mockReturnValue({
      api: 'https://api.test.com/api.php/provide/vod',
      sourceType: 'cms'
    })
    cms.detail.mockResolvedValue({
      vod_id: '123',
      vod_name: '测试动漫',
      vod_play_from: '线路1',
      vod_play_url: '第1集$url1#第2集$url2'
    })

    const result = await getAnimeDetail('123')
    expect(cms.detail).toHaveBeenCalledWith('https://api.test.com/api.php/provide/vod', '123')
    expect(result.vod_name).toBe('测试动漫')
  })

  it('通过插件引擎获取详情并归一化', async () => {
    getActiveSource.mockReturnValue({
      api: 'csp_xpath',
      sourceType: 'plugin',
      cspModule: 'xpath',
      name: 'XPath源',
      ext: 'https://example.com/xpath.js'
    })
    engine.pluginDetail.mockResolvedValue({
      list: [{
        vod_id: '1',
        vod_name: '插件详情',
        vod_pic: 'http://img.jpg',
        vod_play_from: '线路1',
        vod_play_url: '第1集$http://a.m3u8#第2集$http://b.m3u8'
      }]
    })

    const result = await getAnimeDetail('1')
    expect(engine.pluginDetail).toHaveBeenCalledWith('xpath', '1')
    expect(result.title).toBe('插件详情')
    expect(result.id).toBe('1')
    expect(result.playFrom).toBe('线路1')
    expect(result.episodeSources).toHaveLength(1)
    expect(result.episodeSources[0]).toHaveLength(2)
    expect(result.episodeSources[0][0].name).toBe('第1集')
    expect(result.episodeSources[0][0].url).toBe('http://a.m3u8')
  })
})

describe('parsePlayUrl', () => {
  it('解析多线路播放地址', () => {
    const input = '第1集$http://a.com/1.mp4#第2集$http://a.com/2.mp4$$$第1集$http://b.com/1.mp4'
    cms.parsePlayUrl.mockReturnValue([
      [
        { index: 0, name: '第1集', url: 'http://a.com/1.mp4', sourceIndex: 0 },
        { index: 1, name: '第2集', url: 'http://a.com/2.mp4', sourceIndex: 0 }
      ],
      [
        { index: 0, name: '第1集', url: 'http://b.com/1.mp4', sourceIndex: 1 }
      ]
    ])

    const result = parsePlayUrl(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveLength(2)
    expect(result[1]).toHaveLength(1)
  })

  it('空字符串返回空数组', () => {
    cms.parsePlayUrl.mockReturnValue([])
    expect(parsePlayUrl('')).toEqual([])
  })

  it('null 返回空数组', () => {
    cms.parsePlayUrl.mockReturnValue([])
    expect(parsePlayUrl(null)).toEqual([])
  })
})
