import { describe, it, expect } from 'vitest'
import {
  stripJsonComments,
  extractJson,
  isAllHex,
  isLikelyBase64,
  tryParseJson,
  parseSites
} from '../../src/api/sub-client.js'

describe('stripJsonComments', () => {
  it('移除单行注释', () => {
    const input = '// comment\n{"key": "value"}'
    expect(stripJsonComments(input)).toBe('{"key": "value"}')
  })

  it('移除多行注释', () => {
    const input = '/* block\ncomment */\n{"key": "value"}'
    expect(stripJsonComments(input)).toBe('{"key": "value"}')
  })

  it('移除 BOM 头', () => {
    const input = '\uFEFF{"key": "value"}'
    expect(stripJsonComments(input)).toBe('{"key": "value"}')
  })

  it('保留不含注释的内容', () => {
    const input = '{"sites": []}'
    expect(stripJsonComments(input)).toBe('{"sites": []}')
  })
})

describe('extractJson', () => {
  it('从混合文本中提取 JSON', () => {
    const input = 'prefix {"key": "value"} suffix'
    expect(extractJson(input)).toBe('{"key": "value"}')
  })

  it('没有大括号时返回原文', () => {
    expect(extractJson('plain text')).toBe('plain text')
  })

  it('没有闭合大括号时返回原文', () => {
    expect(extractJson('broken { json')).toBe('broken { json')
  })

  it('提取嵌套 JSON', () => {
    const input = 'data: {"a": {"b": 1}}'
    expect(extractJson(input)).toBe('{"a": {"b": 1}}')
  })
})

describe('isAllHex', () => {
  it('纯十六进制偶数长度返回 true', () => {
    expect(isAllHex('abcdef012345')).toBe(true)
    expect(isAllHex('ABCDEF012345')).toBe(true)
  })

  it('奇数长度返回 false', () => {
    expect(isAllHex('abcdef01234')).toBe(false)
  })

  it('含非十六进制字符返回 false', () => {
    expect(isAllHex('abcxyz01')).toBe(false)
  })

  it('空字符串返回 false', () => {
    expect(isAllHex('')).toBe(false)
  })
})

describe('isLikelyBase64', () => {
  it('标准 Base64 字符串返回 true', () => {
    const b64 = 'A'.repeat(24)
    expect(isLikelyBase64(b64)).toBe(true)
  })

  it('短字符串返回 false', () => {
    expect(isLikelyBase64('abc')).toBe(false)
  })

  it('长度不是 4 的倍数返回 false', () => {
    expect(isLikelyBase64('A'.repeat(21))).toBe(false)
  })

  it('含非法字符返回 false', () => {
    expect(isLikelyBase64('A'.repeat(20) + '!@')).toBe(false)
  })
})

describe('tryParseJson', () => {
  it('解析标准 JSON', () => {
    expect(tryParseJson('{"sites": []}')).toEqual({ sites: [] })
  })

  it('解析带注释的 JSON', () => {
    const input = '// comment\n{"key": "value"}'
    expect(tryParseJson(input)).toEqual({ key: 'value' })
  })

  it('解析带前缀的 JSON', () => {
    const input = 'callback({"key": "value"})'
    expect(tryParseJson(input)).toEqual({ key: 'value' })
  })

  it('XML 内容返回 null', () => {
    expect(tryParseJson('<xml>data</xml>')).toBe(null)
  })

  it('无效内容返回 null', () => {
    expect(tryParseJson('not json at all')).toBe(null)
  })

  it('带 BOM 的 JSON', () => {
    expect(tryParseJson('\uFEFF{"a": 1}')).toEqual({ a: 1 })
  })
})

describe('parseSites', () => {
  it('保留 api 含 /api.php 的 HTTP 源（sourceType: cms）', () => {
    const data = {
      sites: [
        { key: 's3', name: 'MacCMS源', api: 'https://api.test.com/api.php/provide/vod/', type: 3 }
      ]
    }
    const result = parseSites(data)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('MacCMS源')
    expect(result[0].supported).toBe(true)
    expect(result[0].sourceType).toBe('cms')
  })

  it('从 csp_AppYsV2 的 ext 提取 API URL（sourceType: appys）', () => {
    const data = {
      sites: [
        { key: 's1', name: 'AppYs源', api: 'csp_AppYsV2', ext: 'https://example.com/api.php/v1.vod', type: 0 },
        { key: 's2', name: 'MacCMS源', api: 'https://api.test.com/api.php/provide/vod/', type: 3 }
      ]
    }
    const result = parseSites(data)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('AppYs源')
    expect(result[0].api).toBe('https://example.com/api.php/v1.vod')
    expect(result[0].ext).toBe('')
    expect(result[0].sourceType).toBe('appys')
    expect(result[1].name).toBe('MacCMS源')
    expect(result[1].sourceType).toBe('cms')
  })

  it('csp_AppYsV2 的 ext 非可用 URL 时保留为插件源', () => {
    const data = {
      sites: [
        { key: 's1', name: 'AppYs源', api: 'csp_AppYsV2', ext: 'https://example.com/page', type: 0 },
        { key: 's2', name: '无ext', api: 'csp_AppYsV2', type: 0 }
      ]
    }
    const result = parseSites(data)
    expect(result).toHaveLength(2)
    expect(result[0].sourceType).toBe('plugin')
    expect(result[0].cspModule).toBe('AppYsV2')
    expect(result[1].sourceType).toBe('plugin')
  })

  it('支持 csp_AppMr 和 csp_AppTv（sourceType: appys）', () => {
    const data = {
      sites: [
        { key: 's1', name: 'Mr源', api: 'csp_AppMr', ext: 'http://a.com/api.php/provide/vod', type: 0 },
        { key: 's2', name: 'Tv源', api: 'csp_AppTv', ext: 'http://b.com/provide/vod', type: 0 }
      ]
    }
    const result = parseSites(data)
    expect(result).toHaveLength(2)
    expect(result[0].sourceType).toBe('appys')
    expect(result[0].api).toBe('http://a.com/api.php/provide/vod')
    expect(result[1].sourceType).toBe('appys')
    expect(result[1].api).toBe('http://b.com/provide/vod')
  })

  it('csp_ 类型标记为 plugin（xpath、Ying 等）', () => {
    const data = {
      sites: [
        { key: 's1', name: 'XPath源', api: 'csp_xpath', ext: 'https://example.com/xpath.js', type: 0 },
        { key: 's2', name: 'Ying源', api: 'csp_Ying', ext: 'https://example.com/ying.js', type: 0 },
        { key: 's3', name: '可用源', api: 'http://api.test.com/provide/vod', type: 3 }
      ]
    }
    const result = parseSites(data)
    expect(result).toHaveLength(3)
    expect(result[0].sourceType).toBe('plugin')
    expect(result[0].cspModule).toBe('xpath')
    expect(result[1].sourceType).toBe('plugin')
    expect(result[1].cspModule).toBe('Ying')
    expect(result[2].sourceType).toBe('cms')
  })

  it('过滤非 HTTP 源', () => {
    const data = {
      sites: [
        { key: 's1', name: '本地源', api: 'local_data', type: 3 },
        { key: 's2', name: '可用源', api: 'http://api.test.com/provide/vod', type: 3 }
      ]
    }
    const result = parseSites(data)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('可用源')
    expect(result[0].api).toBe('http://api.test.com/provide/vod')
  })

  it('过滤缺少 api 或 name 的源', () => {
    const data = {
      sites: [
        { key: 's1' },
        { name: '无API' },
        { key: 's3', name: '正常', api: 'https://api.ok.com/api.php/provide/vod/', type: 3 }
      ]
    }
    const result = parseSites(data)
    expect(result).toHaveLength(1)
  })

  it('无 sites 数组返回空', () => {
    expect(parseSites({})).toEqual([])
    expect(parseSites({ sites: 'not array' })).toEqual([])
  })

  it('API URL 去除尾部斜杠', () => {
    const data = {
      sites: [
        { key: 's1', name: '测试', api: 'https://api.test.com/api.php/provide/vod/', type: 3 }
      ]
    }
    const result = parseSites(data)
    expect(result[0].api).toBe('https://api.test.com/api.php/provide/vod')
  })

  it('保留源的完整字段', () => {
    const data = {
      sites: [{
        key: 'test_key',
        name: '测试源',
        api: 'https://api.test.com/api.php/provide/vod/',
        type: 3,
        searchable: 1,
        quickSearch: 0,
        filterable: 1,
        ext: 'extra',
        jar: 'jar_url',
        categories: ['动漫']
      }]
    }
    const result = parseSites(data)
    expect(result[0]).toEqual({
      key: 'test_key',
      name: '测试源',
      type: 3,
      api: 'https://api.test.com/api.php/provide/vod',
      searchable: 1,
      quickSearch: 0,
      filterable: 1,
      ext: 'extra',
      jar: 'jar_url',
      categories: ['动漫'],
      supported: true,
      sourceType: 'cms',
      cspModule: ''
    })
  })
})
