import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../../src/store/usePlayerStore.js'

function createTestAnime(episodeCount = 5, sourceCount = 2) {
  const episodeSources = []
  for (let s = 0; s < sourceCount; s++) {
    const eps = []
    for (let e = 0; e < episodeCount; e++) {
      eps.push({ name: `第${String(e + 1).padStart(2, '0')}集`, url: `https://source${s}.com/ep${e + 1}.m3u8` })
    }
    episodeSources.push(eps)
  }
  return {
    id: 'test_001',
    name: '测试动漫',
    cover: 'https://example.com/cover.jpg',
    playFrom: '线路1$$$线路2',
    episodeSources
  }
}

describe('usePlayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('playNext', () => {
    it('从第1集播放下一集到第2集', () => {
      const store = usePlayerStore()
      const anime = createTestAnime(5)
      store.loadAnime(anime, 0, 0)

      store.playNext()

      expect(store.currentEpisode.name).toBe('第02集')
      expect(store.currentTime).toBe(0)
      expect(store.duration).toBe(0)
      expect(store.isPlaying).toBe(true)
    })

    it('从中间集正常切换到下一集', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(5), 2, 0)

      store.playNext()

      expect(store.currentEpisode.name).toBe('第04集')
    })

    it('最后一集时不切换', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3), 2, 0)
      const before = store.currentEpisode

      store.playNext()

      expect(store.currentEpisode).toBe(before)
    })

    it('无数据时不崩溃', () => {
      const store = usePlayerStore()
      expect(() => store.playNext()).not.toThrow()
    })
  })

  describe('playPrev', () => {
    it('从第2集返回第1集', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(5), 1, 0)

      store.playPrev()

      expect(store.currentEpisode.name).toBe('第01集')
      expect(store.currentTime).toBe(0)
      expect(store.isPlaying).toBe(true)
    })

    it('从中间集正常切换到上一集', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(5), 3, 0)

      store.playPrev()

      expect(store.currentEpisode.name).toBe('第03集')
    })

    it('第一集时不切换', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3), 0, 0)
      const before = store.currentEpisode

      store.playPrev()

      expect(store.currentEpisode).toBe(before)
    })

    it('无数据时不崩溃', () => {
      const store = usePlayerStore()
      expect(() => store.playPrev()).not.toThrow()
    })
  })

  describe('switchSource', () => {
    it('切换到同名集的另一线路', () => {
      const store = usePlayerStore()
      const anime = createTestAnime(5, 2)
      store.loadAnime(anime, 1, 0)

      expect(store.currentSourceIndex).toBe(0)
      expect(store.currentEpisode.name).toBe('第02集')

      store.switchSource(1)

      expect(store.currentSourceIndex).toBe(1)
      expect(store.currentEpisode.name).toBe('第02集')
      expect(store.currentEpisode.url).toBe('https://source1.com/ep2.m3u8')
      expect(store.currentTime).toBe(0)
    })

    it('目标线路集数不同时回退到第一集', () => {
      const store = usePlayerStore()
      const anime = {
        id: 'test',
        name: '测试',
        playFrom: '线路1$$$线路2',
        episodeSources: [
          [{ name: '第01集', url: 'https://a.com/1.m3u8' }, { name: '第02集', url: 'https://a.com/2.m3u8' }, { name: '第03集', url: 'https://a.com/3.m3u8' }],
          [{ name: '第01集', url: 'https://b.com/1.m3u8' }]
        ]
      }
      store.loadAnime(anime, 2, 0)
      expect(store.currentEpisode.name).toBe('第03集')

      store.switchSource(1)

      expect(store.currentSourceIndex).toBe(1)
      expect(store.currentEpisode.name).toBe('第01集')
    })

    it('无效线路索引不切换', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3, 2), 0, 0)
      const before = store.currentSourceIndex

      store.switchSource(5)

      expect(store.currentSourceIndex).toBe(before)
    })

    it('切换线路后 playNext 在新线路上工作', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(5, 2), 0, 0)
      store.switchSource(1)

      store.playNext()

      expect(store.currentEpisode.url).toBe('https://source1.com/ep2.m3u8')
    })
  })

  describe('loadAnime', () => {
    it('加载动漫并设置初始集', () => {
      const store = usePlayerStore()
      const anime = createTestAnime(5)

      store.loadAnime(anime, 0, 0)

      expect(store.currentAnime).toStrictEqual(anime)
      expect(store.currentEpisode.name).toBe('第01集')
      expect(store.currentSourceIndex).toBe(0)
      expect(store.isPlaying).toBe(true)
      expect(store.currentTime).toBe(0)
    })

    it('指定集索引和线路索引', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(5, 3), 2, 1)

      expect(store.currentEpisode.name).toBe('第03集')
      expect(store.currentSourceIndex).toBe(1)
    })

    it('超出集索引回退到第一集', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3), 99, 0)

      expect(store.currentEpisode.name).toBe('第01集')
    })
  })

  describe('playEpisode', () => {
    it('播放指定集', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(5), 0, 0)

      store.playEpisode(3)

      expect(store.currentEpisode.name).toBe('第04集')
      expect(store.isPlaying).toBe(true)
    })

    it('无效索引不切换', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3), 0, 0)
      const before = store.currentEpisode

      store.playEpisode(-1)
      expect(store.currentEpisode).toBe(before)

      store.playEpisode(99)
      expect(store.currentEpisode).toBe(before)
    })
  })

  describe('computed', () => {
    it('progress 百分比正确', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3), 0, 0)
      store.updateTime(30)
      store.setDuration(120)

      expect(store.progress).toBe(25)
    })

    it('duration 为 0 时 progress 为 0', () => {
      const store = usePlayerStore()
      expect(store.progress).toBe(0)
    })

    it('currentUrl 返回当前集 URL', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3), 1, 0)

      expect(store.currentUrl).toBe('https://source0.com/ep2.m3u8')
    })

    it('sourceNames 正确分割', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3, 2), 0, 0)

      expect(store.sourceNames).toEqual(['线路1', '线路2'])
    })
  })

  describe('volume', () => {
    it('setVolume 限制在 0-1', () => {
      const store = usePlayerStore()
      store.setVolume(1.5)
      expect(store.volume).toBe(1)

      store.setVolume(-0.5)
      expect(store.volume).toBe(0)
    })

    it('setVolume > 0 时取消静音', () => {
      const store = usePlayerStore()
      store.toggleMute()
      expect(store.isMuted).toBe(true)

      store.setVolume(0.5)
      expect(store.isMuted).toBe(false)
    })
  })

  describe('reset', () => {
    it('重置所有状态', () => {
      const store = usePlayerStore()
      store.loadAnime(createTestAnime(3), 1, 0)
      store.updateTime(60)
      store.setDuration(120)

      store.reset()

      expect(store.currentAnime).toBe(null)
      expect(store.currentEpisode).toBe(null)
      expect(store.currentSourceIndex).toBe(0)
      expect(store.isPlaying).toBe(false)
      expect(store.currentTime).toBe(0)
      expect(store.duration).toBe(0)
    })
  })
})
