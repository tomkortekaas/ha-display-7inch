import { join } from 'node:path'

import { NextRequest, NextResponse } from 'next/server'

import { AhClient, fetchRecipesForList } from '@/lib/ah'
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
  const listKey = request.nextUrl.searchParams.get('list') ?? 'cart'
  const refresh = request.nextUrl.searchParams.get('refresh') === '1'
  const cached = getCachedRecipeList(listKey)

  if (cached.length > 0 && !refresh) {
    void fetchRecipesForList(client, listKey)
      .then((result) => cacheRecipeList(listKey, result.recipes))
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Onbekende AH-fout'
        console.error('[ah/recipes/background-refresh]', message)
      })

    void warmRecipeDetails(
      client,
      cached.map((recipe) => recipe.id),
    )

    return NextResponse.json(
      {
        list: { key: listKey },
        lists: [],
        recipes: cached,
        source: 'cache',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const result = await fetchRecipesForList(client, listKey)
    cacheRecipeList(listKey, result.recipes)

    void warmRecipeDetails(
      client,
      result.recipes.map((recipe) => recipe.id),
    )

    return NextResponse.json(
      {
        list: result.list,
        lists: result.lists,
        recipes: result.recipes,
        source: 'live',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Onbekende AH-fout'
    console.error('[ah/recipes]', message)

    return NextResponse.json(
      {
        list: null,
        lists: [],
        recipes: getCachedRecipeList(listKey),
        error: message,
        source: 'cache',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
