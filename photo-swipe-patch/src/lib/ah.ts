import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const AH_API_URL = 'https://api.ah.nl'
const AH_CLIENT_ID = 'appie-ios'
const AH_CLIENT_VERSION = '9.28'
const AH_USER_AGENT =
  'Appie/9.28 (iPhone17,3; iPhone; CPU OS 26_1 like Mac OS X)'

export const AH_HEADERS = {
  'User-Agent': AH_USER_AGENT,
  'x-client-name': AH_CLIENT_ID,
  'x-client-version': AH_CLIENT_VERSION,
  'x-application': 'AHWEBSHOP',
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function refreshAccessToken(
  refreshToken: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    `${AH_API_URL}/mobile-auth/v1/auth/token/refresh`,
    {
      method: 'POST',
      headers: AH_HEADERS,
      body: JSON.stringify({
        clientId: AH_CLIENT_ID,
        refreshToken,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`AH token vernieuwen mislukt (${response.status})`)
  }

  const token = (await response.json()) as TokenResponse
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + Math.max(60, token.expires_in - 60) * 1000,
  }
}

type StoredToken = Awaited<ReturnType<typeof refreshAccessToken>>

type AhClientOptions = {
  initialRefreshToken: string
  tokenFile: string
  fetcher?: typeof fetch
}

export class AhClient {
  private readonly initialRefreshToken: string
  private readonly tokenFile: string
  private readonly fetcher: typeof fetch
  private token: StoredToken | null = null
  private loaded = false

  constructor(options: AhClientOptions) {
    this.initialRefreshToken = options.initialRefreshToken
    this.tokenFile = options.tokenFile
    this.fetcher = options.fetcher ?? fetch
  }

  private async loadToken() {
    if (this.loaded) return
    this.loaded = true
    try {
      this.token = JSON.parse(
        await readFile(this.tokenFile, 'utf8'),
      ) as StoredToken
    } catch {
      this.token = null
    }
  }

  private async saveToken(token: StoredToken) {
    await mkdir(dirname(this.tokenFile), { recursive: true })
    await writeFile(this.tokenFile, JSON.stringify(token), {
      encoding: 'utf8',
      mode: 0o600,
    })
  }

  private async getAccessToken() {
    await this.loadToken()
    if (this.token && Date.now() < this.token.expiresAt) {
      return this.token.accessToken
    }

    const refreshToken =
      this.token?.refreshToken || this.initialRefreshToken
    if (!refreshToken) {
      throw new Error('AH_REFRESH_TOKEN ontbreekt')
    }

    this.token = await refreshAccessToken(refreshToken, this.fetcher)
    await this.saveToken(this.token)
    return this.token.accessToken
  }

  async graphql<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const accessToken = await this.getAccessToken()
    const response = await this.fetcher(`${AH_API_URL}/graphql`, {
      method: 'POST',
      headers: {
        ...AH_HEADERS,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`AH GraphQL mislukt (${response.status})`)
    }

    const payload = (await response.json()) as {
      data?: T
      errors?: Array<{ message?: string }>
    }
    if (payload.errors?.length) {
      throw new Error(payload.errors[0]?.message || 'AH GraphQL fout')
    }
    if (!payload.data) {
      throw new Error('AH GraphQL gaf geen data terug')
    }
    return payload.data
  }
}

type FavoriteCategory = {
  id: number
  name: string
  isDefault: boolean
  recipes?: Array<{
    id: number
    title: string
    time?: { cook?: number | null } | null
    images?: Array<{
      url?: string | null
      width?: number | null
      height?: number | null
    } | null> | null
  }>
}

type RecipeSummaryResponse = {
  id: number
  title: string
  time?: { cook?: number | null } | null
  serving?: { number?: number | null } | null
  images?: Array<{
    url?: string | null
    width?: number | null
    height?: number | null
  } | null> | null
}

export type AhRecipeSummary = {
  id: string
  title: string
  duration: number
  servings: number
  imageUrl: string
}

export type AhRecipeList = {
  key: string
  id: string
  name: string
  isDefault: boolean
  recipes: AhRecipeSummary[]
}

export type AhRecipeDetail = AhRecipeSummary & {
  ingredients: string[]
  steps: string[]
}

function pickRecipeImageUrl(
  images:
    | Array<{ url?: string | null; width?: number | null; height?: number | null } | null>
    | null
    | undefined,
) {
  return (
    images
      ?.map((image) => image?.url?.trim() ?? '')
      .find(Boolean) ?? ''
  )
}

function normalizeRecipeSummary(recipe: RecipeSummaryResponse): AhRecipeSummary {
  return {
    id: String(recipe.id),
    title: recipe.title || 'Onbekend recept',
    duration: recipe.time?.cook ?? 0,
    servings: recipe.serving?.number ?? 4,
    imageUrl: pickRecipeImageUrl(recipe.images),
  }
}

function slugListKey(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function normalizeRecipeCategories(
  categories: FavoriteCategory[],
): AhRecipeList[] {
  return categories.map((category) => ({
    key: category.isDefault ? 'favorites' : slugListKey(category.name),
    id: String(category.id),
    name: category.name || 'Recepten',
    isDefault: Boolean(category.isDefault),
    recipes: (category.recipes ?? []).map(normalizeRecipeSummary),
  }))
}

export function selectRecipeList(
  lists: AhRecipeList[],
  listKey = 'favorites',
) {
  if (listKey === 'cart') {
    const aliases = [
      'eerder toegevoegd aan mandje',
      'eerder toegevoegd',
      'toegevoegd aan mandje',
    ]
    return (
      lists.find((list) =>
        aliases.some((alias) => list.name.toLowerCase().includes(alias)),
      ) ??
      lists.find((list) => list.key.includes('mandje')) ??
      lists.find((list) => list.key.includes('eerder_toegevoegd'))
    )
  }

  if (listKey === 'favorites') {
    return (
      lists.find((item) => item.isDefault) ??
      lists.find((item) => item.name === 'Mijn Favorieten') ??
      lists.find((item) => item.key === 'favorites')
    )
  }

  return lists.find((item) => item.key === listKey || item.id === listKey)
}

export function normalizeFavoriteCategories(categories: FavoriteCategory[]) {
  const lists = normalizeRecipeCategories(categories)
  const category =
    selectRecipeList(lists, 'favorites') ??
    lists[0]

  return category?.recipes ?? []
}

type RecipeDetail = {
  id: number
  title: string
  cookTime?: number | null
  waitTime?: number | null
  ovenTime?: number | null
  servings?: { number?: number | null } | null
  ingredients?: Array<{ text?: string | null }> | null
  preparation?: { steps?: Array<string | null> | null } | null
}

export function normalizeRecipe(recipe: RecipeDetail): AhRecipeDetail {
  return {
    id: String(recipe.id),
    title: recipe.title || 'Recept',
    duration:
      (recipe.cookTime ?? 0) +
      (recipe.waitTime ?? 0) +
      (recipe.ovenTime ?? 0),
    servings: recipe.servings?.number ?? 4,
    imageUrl: '',
    ingredients: (recipe.ingredients ?? [])
      .map((ingredient) => ingredient.text?.trim() ?? '')
      .filter(Boolean),
    steps: (recipe.preparation?.steps ?? [])
      .map((step) => step?.trim() ?? '')
      .filter(Boolean),
  }
}

export function wrapRecipeStep(step: number, length: number) {
  if (!Number.isFinite(step) || length < 1) return 0
  return ((Math.trunc(step) % length) + length) % length
}

export type GraphQLClient = {
  graphql: (
    query: string,
    variables?: Record<string, unknown>,
  ) => Promise<any>
}

const FAVORITES_QUERY = `
  query FavoriteRecipes {
    recipeCollectionCategories {
      id
      name
      isDefault
      recipes {
        id
        title
        time { cook }
        images {
          url
          width
          height
        }
      }
    }
  }
`

const SHOPPED_RECIPES_QUERY = `
  query ShoppedRecipes {
    recipeShoppedRecipes {
      lastShoppedAt
      recipe {
        id
        title
        time { cook }
        serving { number }
        images {
          url
          width
          height
        }
      }
    }
  }
`

const RECIPE_QUERY = `
  query Recipe($id: Int!) {
    recipe(id: $id) {
      id
      title
      description
      cookTime
      waitTime
      ovenTime
      servings { number }
      ingredients { text }
      preparation { steps }
    }
  }
`

export async function fetchShoppedRecipes(client: GraphQLClient) {
  const data = await client.graphql(SHOPPED_RECIPES_QUERY)
  return ((data.recipeShoppedRecipes ?? []) as Array<{
    recipe?: RecipeSummaryResponse | null
  }>)
    .map((item) => item.recipe)
    .filter((recipe): recipe is RecipeSummaryResponse => Boolean(recipe))
    .map(normalizeRecipeSummary)
}

export async function fetchRecipeLists(client: GraphQLClient) {
  const data = await client.graphql(FAVORITES_QUERY)
  return normalizeRecipeCategories(data.recipeCollectionCategories ?? [])
}

export async function fetchRecipesForList(
  client: GraphQLClient,
  listKey = 'favorites',
) {
  if (listKey === 'cart') {
    const recipes = await fetchShoppedRecipes(client)
    return {
      list: {
        key: 'cart',
        id: 'recipeShoppedRecipes',
        name: 'Eerder toegevoegd aan mandje',
        isDefault: false,
        recipes,
      },
      lists: [
        {
          key: 'cart',
          id: 'recipeShoppedRecipes',
          name: 'Eerder toegevoegd aan mandje',
          isDefault: false,
          count: recipes.length,
        },
      ],
      recipes,
    }
  }

  const lists = await fetchRecipeLists(client)
  const selected = selectRecipeList(lists, listKey)
  return {
    list: selected ?? null,
    lists: lists.map(({ recipes, ...list }) => ({
      ...list,
      count: recipes.length,
    })),
    recipes: selected?.recipes ?? [],
  }
}

export async function fetchFavoriteRecipes(client: GraphQLClient) {
  const { recipes } = await fetchRecipesForList(client, 'favorites')
  return recipes
}

export async function fetchRecipeDetail(
  client: GraphQLClient,
  id: number,
) {
  const data = await client.graphql(RECIPE_QUERY, { id })
  if (!data.recipe) {
    throw new Error('Recept niet gevonden')
  }
  return normalizeRecipe(data.recipe)
}
