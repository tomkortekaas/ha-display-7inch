import { join } from 'node:path'

import { NextRequest, NextResponse } from 'next/server'

import { AhClient, fetchFavoriteRecipes } from '@/lib/ah'
import { cacheRecipeList, getCachedRecipeList } from '@/lib/ah-cache'
import { warmRecipeDetails } from '@/lib/ah-warm'

export const dynamic = 'force-dynamic'

const client = new AhClient({
  initialRefreshToken: process.env.AH_REFRESH_TOKEN ?? '',
  tokenFile:
    process.env.AH_TOKEN_PATH ??
    join(process.env.DATA_DIR ?? '/tmp', 'ah-token.json'),
})

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get('refresh') === '1'
  const cached = getCachedRecipeList('favorites')

  if (cached.length > 0 && !refresh) {
    void fetchFavoriteRecipes(client)
      .then((favorites) => cacheRecipeList('favorites', favorites))
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Onbekende AH-fout'
        console.error('[ah/favorites/background-refresh]', message)
      })

    void warmRecipeDetails(
      client,
      cached.map((recipe) => recipe.id),
    )

    return NextResponse.json(
      { favorites: cached, source: 'cache' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const favorites = await fetchFavoriteRecipes(client)
    cacheRecipeList('favorites', favorites)

    void warmRecipeDetails(
      client,
      favorites.map((recipe) => recipe.id),
    )

    return NextResponse.json(
      { favorites, source: 'live' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Onbekende AH-fout'
    console.error('[ah/favorites]', message)
    const favorites = getCachedRecipeList('favorites')
    return NextResponse.json(
      { favorites, error: message, source: 'cache' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
