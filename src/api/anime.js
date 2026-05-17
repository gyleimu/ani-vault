import { searchAnime as sourceSearch, getAnimeDetail as sourceDetail, getAnimeList as sourceList } from './source-client'

export function searchAnime(keyword, params = {}) {
  return sourceSearch(keyword, params.source)
}

export function getAnimeDetail(id, source) {
  return sourceDetail(id, source)
}

export function getAnimeList(params = {}) {
  return sourceList(params)
}

export function getRecommendations(page = 1) {
  return sourceList({ page, typeId: '2' })
}
