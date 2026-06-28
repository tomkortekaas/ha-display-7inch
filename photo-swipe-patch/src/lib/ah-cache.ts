import db from './db'
import type { AhRecipeDetail, AhRecipeSummary } from './ah'

type CachedRecipeRow = {
  id: string
  title: string
  duration: number
  servings: number
  image_url: string
  detail_json: string
}

function toSummary(row: CachedRecipeRow): AhRecipeSummary {
  return {
    id: row.id,
    title: row.title,
    duration: row.duration,
    servings: row.servings,
    imageUrl: row.image_url,
  }
}

export function cacheRecipeList(
  listKey: string,
  recipes: AhRecipeSummary[],
) {
  const now = Date.now()
  const upsertRecipe = db.prepare(`
    INSERT INTO ah_recipes (
      id, title, duration, servings, image_url, updated_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      duration = excluded.duration,
      servings = excluded.servings,
      image_url = excluded.image_url,
      updated_at = excluded.updated_at,
      last_seen_at = excluded.last_seen_at
  `)
  const clearList = db.prepare('DELETE FROM ah_recipe_lists WHERE list_key = ?')
  const insertList = db.prepare(`
    INSERT INTO ah_recipe_lists (list_key, recipe_id, position, synced_at)
    VALUES (?, ?, ?, ?)
  `)

  db.transaction(() => {
    clearList.run(listKey)
    recipes.forEach((recipe, index) => {
      upsertRecipe.run(
        recipe.id,
        recipe.title,
        recipe.duration,
        recipe.servings,
        recipe.imageUrl,
        now,
        now,
      )
      insertList.run(listKey, recipe.id, index, now)
    })
  })()
}

export function getCachedRecipeList(listKey: string) {
  const rows = db
    .prepare(
      `
        SELECT r.*
        FROM ah_recipe_lists l
        JOIN ah_recipes r ON r.id = l.recipe_id
        WHERE l.list_key = ?
        ORDER BY l.position ASC
      `,
    )
    .all(listKey) as CachedRecipeRow[]

  return rows.map(toSummary)
}

export function cacheRecipeDetail(recipe: AhRecipeDetail) {
  const now = Date.now()
  db.prepare(
    `
      INSERT INTO ah_recipes (
        id, title, duration, servings, image_url, detail_json,
        detail_synced_at, updated_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        duration = excluded.duration,
        servings = excluded.servings,
        image_url = COALESCE(NULLIF(excluded.image_url, ''), ah_recipes.image_url),
        detail_json = excluded.detail_json,
        detail_synced_at = excluded.detail_synced_at,
        updated_at = excluded.updated_at,
        last_seen_at = excluded.last_seen_at
    `,
  ).run(
    recipe.id,
    recipe.title,
    recipe.duration,
    recipe.servings,
    recipe.imageUrl,
    JSON.stringify(recipe),
    now,
    now,
    now,
  )
}

export function getCachedRecipeDetail(id: string) {
  const row = db
    .prepare('SELECT * FROM ah_recipes WHERE id = ?')
    .get(id) as CachedRecipeRow | undefined

  if (!row?.detail_json) return null

  try {
    const recipe = JSON.parse(row.detail_json) as AhRecipeDetail
    return {
      ...recipe,
      imageUrl: recipe.imageUrl || row.image_url,
    }
  } catch {
    return null
  }
}
