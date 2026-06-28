import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  AhClient,
  fetchFavoriteRecipes,
  fetchRecipeDetail,
  fetchRecipesForList,
  normalizeFavoriteCategories,
  normalizeRecipeCategories,
  normalizeRecipe,
  refreshAccessToken,
  selectRecipeList,
  wrapRecipeStep,
} from './ah'

describe('refreshAccessToken', () => {
  it('uses the current appie-ios JSON refresh flow', async () => {
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined
    const fetcher: typeof fetch = async (input, init) => {
      request = { input, init }
      return Response.json({
        access_token: 'access-2',
        refresh_token: 'refresh-2',
        expires_in: 7199,
      })
    }

    const token = await refreshAccessToken('refresh-1', fetcher)

    expect(String(request?.input)).toBe(
      'https://api.ah.nl/mobile-auth/v1/auth/token/refresh',
    )
    expect(request?.init?.method).toBe('POST')
    expect(request?.init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-client-name': 'appie-ios',
      'x-client-version': '9.28',
    })
    expect(JSON.parse(String(request?.init?.body))).toEqual({
      clientId: 'appie-ios',
      refreshToken: 'refresh-1',
    })
    expect(token).toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    })
  })
})

describe('AhClient', () => {
  it('persists a rotated refresh token after the first GraphQL request', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ah-client-'))
    const tokenFile = join(directory, 'token.json')
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input)
      requests.push({ url, init })
      if (url.endsWith('/token/refresh')) {
        return Response.json({
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 7199,
        })
      }
      return Response.json({ data: { ok: true } })
    }
    const client = new AhClient({
      initialRefreshToken: 'refresh-1',
      tokenFile,
      fetcher,
    })

    await client.graphql('query { ok }')

    expect(JSON.parse(await readFile(tokenFile, 'utf8'))).toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    })
    expect(requests[1]?.init?.headers).toMatchObject({
      Authorization: 'Bearer access-2',
    })
  })
})

describe('normalizeFavoriteCategories', () => {
  it('returns recipes from the default Mijn Favorieten category', () => {
    const favorites = normalizeFavoriteCategories([
      {
        id: 0,
        name: 'Mijn Favorieten',
        isDefault: true,
        recipes: [
          {
            id: 1200054,
            title: 'Broodje chipolata',
            time: { cook: 25 },
            images: [{ url: 'https://static.ah.nl/recept.jpg' }],
          },
        ],
      },
      {
        id: 1,
        name: 'Andere map',
        isDefault: false,
        recipes: [{ id: 2, title: 'Niet tonen', time: { cook: 10 } }],
      },
    ])

    expect(favorites).toEqual([
      {
        id: '1200054',
        title: 'Broodje chipolata',
        duration: 25,
        servings: 4,
        imageUrl: 'https://static.ah.nl/recept.jpg',
      },
    ])
  })
})

describe('recipe collection selection', () => {
  it('selects Eerder toegevoegd aan mandje for the cart list', () => {
    const lists = normalizeRecipeCategories([
      {
        id: 1,
        name: 'Mijn Favorieten',
        isDefault: true,
        recipes: [],
      },
      {
        id: 2,
        name: 'Eerder toegevoegd aan mandje',
        isDefault: false,
        recipes: [{ id: 42, title: 'Pasta', time: { cook: 20 } }],
      },
    ])

    expect(selectRecipeList(lists, 'cart')?.recipes).toMatchObject([
      { id: '42', title: 'Pasta' },
    ])
  })
})

describe('AH recipe queries', () => {
  it('fetches and normalizes the default recipe collection', async () => {
    const client = {
      graphql: async () => ({
        recipeCollectionCategories: [
          {
            id: 0,
            name: 'Mijn Favorieten',
            isDefault: true,
            recipes: [
              {
                id: 1200054,
                title: 'Broodje chipolata',
                time: { cook: 25 },
                images: [{ url: 'https://static.ah.nl/recept.jpg' }],
              },
            ],
          },
        ],
      }),
    }

    await expect(fetchFavoriteRecipes(client)).resolves.toEqual([
      {
        id: '1200054',
      title: 'Broodje chipolata',
      duration: 25,
      servings: 4,
      imageUrl: 'https://static.ah.nl/recept.jpg',
    },
  ])
})

  it('fetches and normalizes one recipe detail', async () => {
    const client = {
      graphql: async () => ({
        recipe: {
          id: 1200054,
          title: 'Broodje chipolata',
          cookTime: 25,
          servings: { number: 4 },
          ingredients: [{ text: '1 ui' }],
          preparation: { steps: ['Steek de barbecue aan.'] },
        },
      }),
    }

    await expect(fetchRecipeDetail(client, 1200054)).resolves.toMatchObject({
      id: '1200054',
      ingredients: ['1 ui'],
      steps: ['Steek de barbecue aan.'],
    })
  })

  it('fetches shopped recipes for the cart list', async () => {
    const client = {
      graphql: async () => ({
        recipeShoppedRecipes: [
          {
            lastShoppedAt: '2026-06-25T05:00:00Z',
            recipe: {
              id: 1200054,
              title: 'Broodje chipolata',
              time: { cook: 25 },
              serving: { number: 2 },
              images: [{ url: 'https://static.ah.nl/recept.jpg' }],
            },
          },
        ],
      }),
    }

    await expect(fetchRecipesForList(client, 'cart')).resolves.toMatchObject({
      list: { name: 'Eerder toegevoegd aan mandje' },
      recipes: [
        {
          id: '1200054',
          title: 'Broodje chipolata',
          duration: 25,
          servings: 2,
          imageUrl: 'https://static.ah.nl/recept.jpg',
        },
      ],
    })
  })
})

describe('normalizeRecipe', () => {
  it('normalizes AH GraphQL recipe details for rendering', () => {
    const recipe = normalizeRecipe({
      id: 1200054,
      title: 'Broodje chipolata',
      cookTime: 25,
      waitTime: 5,
      ovenTime: null,
      servings: { number: 4 },
      ingredients: [{ text: '1 middelgrote ui' }],
      preparation: { steps: ['Steek de barbecue aan.'] },
    })

    expect(recipe).toEqual({
      id: '1200054',
      title: 'Broodje chipolata',
      duration: 30,
      servings: 4,
      imageUrl: '',
      ingredients: ['1 middelgrote ui'],
      steps: ['Steek de barbecue aan.'],
    })
  })
})

describe('wrapRecipeStep', () => {
  it('cycles to the first step after the final step', () => {
    expect(wrapRecipeStep(0, 6)).toBe(0)
    expect(wrapRecipeStep(5, 6)).toBe(5)
    expect(wrapRecipeStep(6, 6)).toBe(0)
  })
})
