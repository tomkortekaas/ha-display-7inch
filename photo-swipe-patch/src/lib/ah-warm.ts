import { fetchRecipeDetail, type GraphQLClient } from './ah'
import { cacheRecipeDetail, getRecipeIdsMissingDetail } from './ah-cache'

const DELAY_MS = 1200
const MAX_PER_RUN = 8

let warming = false

/**
 * Haalt, gedrosseld en op de achtergrond, de details op van recepten die nog
 * niet in de cache zitten. Zo staat een recept al klaar voordat iemand erop
 * tikt op het display, en hoeft dat moment zelf nooit op een levende
 * AH-sessie te wachten. Detail-cache heeft geen TTL (zie ah-cache.ts), dus
 * eenmaal gewarmde recepten blijven werken ook als AH later niet bereikbaar is.
 */
export async function warmRecipeDetails(client: GraphQLClient, ids: string[]) {
  if (warming) return
  const missing = getRecipeIdsMissingDetail(ids).slice(0, MAX_PER_RUN)
  if (missing.length === 0) return

  warming = true
  try {
    for (const id of missing) {
      try {
        const recipe = await fetchRecipeDetail(client, Number.parseInt(id, 10))
        cacheRecipeDetail(recipe)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Onbekende AH-fout'
        console.error('[ah/warm]', id, message)
        if (message.includes('token vernieuwen mislukt')) {
          // AH-sessie is stuk; verdere pogingen in deze run hebben geen zin.
          break
        }
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }
  } finally {
    warming = false
  }
}
