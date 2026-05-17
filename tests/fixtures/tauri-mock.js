const mockHandlers = {}

export function setMockHandler(cmd, handler) {
  mockHandlers[cmd] = handler
}

export function clearMockHandlers() {
  Object.keys(mockHandlers).forEach(k => delete mockHandlers[k])
}

const MOCK_ANIME_LIST = [
  {
    id: 'test_001',
    name: '进击的巨人 最终季',
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiBmaWxsPSIjODE4Y2Y4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2Ij7ov5Dpq5jmn6XjgII8L3RleHQ+PC9zdmc+',
    year: '2023',
    type: '日本',
    playFrom: '线路1$$$线路2',
    episodeSources: [
      [{ name: '第01集', url: 'https://example.com/ep01.m3u8' }, { name: '第02集', url: 'https://example.com/ep02.m3u8' }],
      [{ name: '第01集', url: 'https://example2.com/ep01.m3u8' }, { name: '第02集', url: 'https://example2.com/ep02.m3u8' }]
    ]
  },
  {
    id: 'test_002',
    name: '鬼灭之刃 柱训练篇',
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiBmaWxsPSIjZjQ3MmI2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2Ij7pobXpnaXkuYvmnInjgII8L3RleHQ+PC9zdmc+',
    year: '2024',
    type: '日本',
    playFrom: '线路1',
    episodeSources: [
      [{ name: '第01集', url: 'https://example.com/kimetsu01.m3u8' }]
    ]
  },
  {
    id: 'test_003',
    name: '咒术回战 第二季',
    cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiBmaWxsPSIjMzhiZGY4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2Ij7lkajmnKzlm57ljbfjgII8L3RleHQ+PC9zdmc+',
    year: '2023',
    type: '日本',
    playFrom: '线路1',
    episodeSources: [
      [{ name: '第01集', url: 'https://example.com/jujutsu01.m3u8' }]
    ]
  }
]

const DEFAULT_HANDLERS = {
  fetch_url: ({ url }) => {
    if (url.includes('ac=detail') || url.includes('wd=')) {
      return JSON.stringify({
        code: 1,
        msg: 'ok',
        list: MOCK_ANIME_LIST.map(a => ({
          vod_id: a.id,
          vod_name: a.name,
          vod_pic: a.cover,
          vod_year: a.year,
          vod_area: a.type,
          vod_play_from: a.playFrom,
          vod_play_url: a.episodeSources.map(src =>
            src.map(ep => `${ep.name}$${ep.url}`).join('#')
          ).join('$$$')
        }))
      })
    }
    return '{}'
  },
  fetch_image: ({ url }) => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiBmaWxsPSIjODE4Y2Y4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0Ij5Nb2NrPC90ZXh0Pjwvc3ZnPg=='
  },
  fetch_bytes: () => {
    return btoa('mock-bytes-data')
  },
  decrypt_text: ({ text }) => {
    return text
  },
  greet: ({ name }) => {
    return `Hello, ${name}!`
  }
}

export async function invoke(cmd, args = {}) {
  const handler = mockHandlers[cmd] || DEFAULT_HANDLERS[cmd]
  if (handler) {
    const result = await handler(args)
    return result
  }
  console.warn(`[mock] unhandled invoke: ${cmd}`, args)
  return null
}

export function getMockAnimeList() {
  return MOCK_ANIME_LIST
}
