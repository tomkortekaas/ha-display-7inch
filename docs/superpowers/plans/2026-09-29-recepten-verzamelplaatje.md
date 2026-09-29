# Receptenlijst met verzamelplaatje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De receptenlijst op het 7-inch display haalt 10 recepten per pagina rechtstreeks bij recipe-hub op, met één verzamelplaatje per pagina in plaats van 24 losse thumbnails via Home Assistant.

**Architecture:** recipe-hub krijgt twee display-endpoints (pagina-JSON en een 96×720-JPEG met 10 thumbnails) plus een begrensde live verversing van de cart-lijst. ESPHome vervangt 24 thumbnail-componenten, 96 HA-sensoren en de scrollende lijst door één `artwork_image`, één laadscript en een pagina met 10 kaarten en bladerknoppen.

**Tech Stack:** recipe-hub: Next.js 16 route handlers, TypeScript, better-sqlite3, jpeg-js, vitest 4. Display: ESPHome 2026.6.4, LVGL 9, externe component `artwork_image` (jtenniswood/espcontrol @ be900d7), ESP32-P4.

**Spec:** `docs/superpowers/specs/2026-09-29-recepten-verzamelplaatje-design.md` (in `ha_display_7inch`).

## Global Constraints

- Paginagrootte: **10**. Verzamelplaatje: **96×720** baseline-JPEG, slot **96×72**, lege plek **#15151F**.
- Live verversen: alleen `list=cart`, alleen pagina 0, hoogstens **1× per 2 minuten**, single-flight.
- Display-URL's: `http://192.168.1.237:3002/api/display/recipes?list=<cart|favorites|custom>&page=<n>` en `http://192.168.1.237:3002/api/display/recipes/sheet?list=…&page=…&v=<version>`.
- Het verzamelplaatje wordt op het display **altijd met `hardware_acceleration: false`** gedecodeerd (gemeten: HW-decode gaf 1 flits op 3 loads).
- Nieuwe code in recipe-hub gebruikt **relatieve imports** (`../../../../lib/…`), zoals de bestaande geteste routes; vitest heeft geen `@/`-alias.
- Geen HA-wijzigingen vóór Task 7, en Task 7 pas na expliciet akkoord van Tom.
- Niets pushen, deployen of flashen zonder expliciet akkoord van Tom (checkpoints A en B).

## Repos en baseline (gemeten 2026-09-29)

| Repo | Pad | Branch voor dit werk | Baseline |
|---|---|---|---|
| recipe-hub | `/Volumes/2TB/Development/Projects/AI_APP/recipe-hub` | `feat/display-recipe-sheet` vanaf `main` (`c74acf3`) | `npx vitest run` → 5 files, **22 tests passed** (na `npm rebuild better-sqlite3`, al gedaan) |
| ha_display_7inch | `/Volumes/2TB/Development/Projects/AI_APP/ha_display_7inch` | `feat/recipe-sheet-list` vanaf `main` | `esphome compile esphome/ha-display-7.yaml` slaagt. Let op: `esphome/ha-display-7.yaml` heeft één niet-gecommitte wijziging van Tom (stroomprijs-sensor, regel ~621). **Niet committen en niet terugdraaien**; laat die regel met rust. |

## File Structure

recipe-hub:
- Create `src/lib/display-recipes.ts` — lijstsleutels, paginering, versie-hash, lijst laden. Pure functies plus één DB-lezer.
- Create `src/lib/display-recipes.test.ts`
- Create `src/lib/display-refresh.ts` — single-flight, tijdbegrensde live verversing (injecteerbare klok en fetch).
- Create `src/lib/display-refresh.test.ts`
- Create `src/lib/display-sheet.ts` — verzamelplaatje samenstellen en thumbnails laden uit de bestaande cache.
- Create `src/lib/display-sheet.test.ts`
- Create `src/app/api/display/recipes/route.ts` en `route.test.ts`
- Create `src/app/api/display/recipes/sheet/route.ts` en `route.test.ts`
- Modify `README.md` — de twee endpoints documenteren.

ha_display_7inch:
- Create `tests/check_recipe_sheet_list.sh` — statische YAML-controle.
- Modify `tests/check_image_load_stability.sh` — de oude recipe-thumb-eisen vervangen.
- Create `tools/migrate_recipe_list.py` — eenmalige, geankerde YAML-migratie (wordt gecommit als verslag van de ingreep).
- Modify `esphome/ha-display-7.yaml` — via het migratiescript.
- Modify `home-assistant/ha-display-7-package.yaml` — pas in Task 7.

---

## Deel A — recipe-hub

Werk in `/Volumes/2TB/Development/Projects/AI_APP/recipe-hub`:

```bash
git checkout -b feat/display-recipe-sheet
```

### Task 1: Paginering, versie en lijst laden

**Files:**
- Create: `src/lib/display-recipes.ts`
- Test: `src/lib/display-recipes.test.ts`

**Interfaces:**
- Consumes: `AhRecipeSummary` (`src/lib/ah.ts`: `{ id: string; title: string; duration: number; servings: number; imageUrl: string }`), `getCachedRecipeList(listKey: string): AhRecipeSummary[]` (`src/lib/ah-cache.ts`), `listCustomRecipes(): AhRecipeSummary[]` (`src/lib/custom-recipes.ts`).
- Produces:
  - `DISPLAY_PAGE_SIZE = 10`
  - `type DisplayListKey = 'cart' | 'favorites' | 'custom'`
  - `isDisplayListKey(value: string | null): value is DisplayListKey`
  - `parsePageParam(value: string | null): number` (niet-numeriek of negatief → 0)
  - `type RecipePage = { page: number; pages: number; total: number; items: AhRecipeSummary[] }`
  - `paginateRecipes(recipes: AhRecipeSummary[], requestedPage: number): RecipePage`
  - `pageVersion(items: AhRecipeSummary[]): string` (10 hex-tekens)
  - `type DisplayRecipe = { id: string; title: string; duration: number; servings: number }`
  - `toDisplayRecipe(recipe: AhRecipeSummary): DisplayRecipe`
  - `loadListRecipes(list: DisplayListKey): AhRecipeSummary[]`

- [ ] **Step 1: Write the failing test**

Maak `src/lib/display-recipes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { AhRecipeSummary } from './ah'
import {
  DISPLAY_PAGE_SIZE,
  isDisplayListKey,
  pageVersion,
  paginateRecipes,
  parsePageParam,
  toDisplayRecipe,
} from './display-recipes'

function recipe(n: number, overrides: Partial<AhRecipeSummary> = {}): AhRecipeSummary {
  return {
    id: String(1000 + n),
    title: `Recept ${n}`,
    duration: 20 + n,
    servings: 4,
    imageUrl: `https://static.ah.nl/r${n}.jpg`,
    ...overrides,
  }
}

const list = (count: number) => Array.from({ length: count }, (_, i) => recipe(i))

describe('display list keys and page params', () => {
  it('accepts only the three display lists', () => {
    expect(isDisplayListKey('cart')).toBe(true)
    expect(isDisplayListKey('favorites')).toBe(true)
    expect(isDisplayListKey('custom')).toBe(true)
    expect(isDisplayListKey('all')).toBe(false)
    expect(isDisplayListKey(null)).toBe(false)
  })

  it('parses the page param defensively', () => {
    expect(parsePageParam(null)).toBe(0)
    expect(parsePageParam('3')).toBe(3)
    expect(parsePageParam('-2')).toBe(0)
    expect(parsePageParam('abc')).toBe(0)
  })
})

describe('paginateRecipes', () => {
  it('uses pages of ten', () => {
    expect(DISPLAY_PAGE_SIZE).toBe(10)
    const result = paginateRecipes(list(23), 2)
    expect(result).toMatchObject({ page: 2, pages: 3, total: 23 })
    expect(result.items.map((r) => r.id)).toEqual(['1020', '1021', '1022'])
  })

  it('clamps a page beyond the end to the last page', () => {
    const result = paginateRecipes(list(23), 9)
    expect(result.page).toBe(2)
    expect(result.items).toHaveLength(3)
  })

  it('returns one empty page for an empty list', () => {
    expect(paginateRecipes([], 0)).toEqual({ page: 0, pages: 1, total: 0, items: [] })
  })
})

describe('pageVersion', () => {
  it('is stable for identical content and ten hex characters long', () => {
    const version = pageVersion(list(10))
    expect(version).toMatch(/^[0-9a-f]{10}$/)
    expect(pageVersion(list(10))).toBe(version)
  })

  it('changes when an id, title, meta or image url on the page changes', () => {
    const base = pageVersion(list(3))
    const changed = (patch: Partial<AhRecipeSummary>) =>
      pageVersion([recipe(0), recipe(1, patch), recipe(2)])
    expect(changed({ id: '9999' })).not.toBe(base)
    expect(changed({ title: 'Anders' })).not.toBe(base)
    expect(changed({ duration: 99 })).not.toBe(base)
    expect(changed({ servings: 2 })).not.toBe(base)
    expect(changed({ imageUrl: 'https://static.ah.nl/other.jpg' })).not.toBe(base)
  })

  it('does not change when only another page changes', () => {
    const before = list(23)
    const after = [...before]
    after[21] = recipe(21, { title: 'Alleen op pagina 3' })
    expect(pageVersion(paginateRecipes(after, 0).items)).toBe(
      pageVersion(paginateRecipes(before, 0).items),
    )
  })
})

describe('toDisplayRecipe', () => {
  it('drops the image url', () => {
    expect(toDisplayRecipe(recipe(1))).toEqual({
      id: '1001',
      title: 'Recept 1',
      duration: 21,
      servings: 4,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/display-recipes.test.ts`
Expected: FAIL — `Failed to resolve import "./display-recipes"`.

- [ ] **Step 3: Write minimal implementation**

Maak `src/lib/display-recipes.ts`:

```ts
import { createHash } from 'node:crypto'

import type { AhRecipeSummary } from './ah'
import { getCachedRecipeList } from './ah-cache'
import { listCustomRecipes } from './custom-recipes'

export const DISPLAY_PAGE_SIZE = 10

const DISPLAY_LIST_KEYS = ['cart', 'favorites', 'custom'] as const
export type DisplayListKey = (typeof DISPLAY_LIST_KEYS)[number]

export type RecipePage = {
  page: number
  pages: number
  total: number
  items: AhRecipeSummary[]
}

export type DisplayRecipe = {
  id: string
  title: string
  duration: number
  servings: number
}

export function isDisplayListKey(value: string | null): value is DisplayListKey {
  return value !== null && (DISPLAY_LIST_KEYS as readonly string[]).includes(value)
}

export function parsePageParam(value: string | null): number {
  const page = Number.parseInt(value ?? '0', 10)
  return Number.isFinite(page) && page > 0 ? page : 0
}

export function paginateRecipes(
  recipes: AhRecipeSummary[],
  requestedPage: number,
): RecipePage {
  const total = recipes.length
  const pages = Math.max(1, Math.ceil(total / DISPLAY_PAGE_SIZE))
  const page = Math.min(Math.max(0, requestedPage), pages - 1)
  const start = page * DISPLAY_PAGE_SIZE
  return { page, pages, total, items: recipes.slice(start, start + DISPLAY_PAGE_SIZE) }
}

// Alles wat het display van deze pagina toont zit in de hash, zodat een
// ongewijzigde pagina bij opnieuw opvragen niet opnieuw getekend hoeft te worden.
export function pageVersion(items: AhRecipeSummary[]): string {
  const hash = createHash('sha1')
  for (const recipe of items) {
    hash.update(
      `${recipe.id}|${recipe.title}|${recipe.duration}|${recipe.servings}|${recipe.imageUrl}\n`,
    )
  }
  return hash.digest('hex').slice(0, 10)
}

export function toDisplayRecipe(recipe: AhRecipeSummary): DisplayRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    duration: recipe.duration,
    servings: recipe.servings,
  }
}

export function loadListRecipes(list: DisplayListKey): AhRecipeSummary[] {
  return list === 'custom' ? listCustomRecipes() : getCachedRecipeList(list)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/display-recipes.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/display-recipes.ts src/lib/display-recipes.test.ts
git commit -m "feat: paginate display recipe lists with a content version"
```

### Task 2: Begrensde live verversing

**Files:**
- Create: `src/lib/display-refresh.ts`
- Test: `src/lib/display-refresh.test.ts`

**Interfaces:**
- Consumes: `AhRecipeSummary`.
- Produces:
  - `LIVE_REFRESH_MIN_INTERVAL_MS = 120_000`
  - `type ListRefresherOptions = { fetchList: () => Promise<AhRecipeSummary[]>; store: (recipes: AhRecipeSummary[]) => void; now?: () => number; minIntervalMs?: number; onError?: (error: unknown) => void }`
  - `type ListRefresher = { maybeRefresh(): boolean; whenIdle(): Promise<void> }`
  - `createListRefresher(options: ListRefresherOptions): ListRefresher`. `maybeRefresh()` geeft `true` als er na de aanroep een verversing loopt (net gestart of al bezig), anders `false`. `whenIdle()` resolvet als de lopende verversing klaar is (voor tests).
  - Een lege lijst van AH wordt **niet** opgeslagen: een lege response wist anders de hele cache.

- [ ] **Step 1: Write the failing test**

Maak `src/lib/display-refresh.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import type { AhRecipeSummary } from './ah'
import { LIVE_REFRESH_MIN_INTERVAL_MS, createListRefresher } from './display-refresh'

const recipes: AhRecipeSummary[] = [
  { id: '1', title: 'Nieuw', duration: 10, servings: 2, imageUrl: 'https://x/1.jpg' },
]

function setup(fetchList = vi.fn(async () => recipes)) {
  let now = 1_000_000
  const store = vi.fn()
  const onError = vi.fn()
  const refresher = createListRefresher({ fetchList, store, now: () => now, onError })
  return { refresher, fetchList, store, onError, advance: (ms: number) => (now += ms) }
}

describe('createListRefresher', () => {
  it('uses a two minute minimum interval', () => {
    expect(LIVE_REFRESH_MIN_INTERVAL_MS).toBe(120_000)
  })

  it('refreshes on the first call and stores the result', async () => {
    const { refresher, store } = setup()
    expect(refresher.maybeRefresh()).toBe(true)
    await refresher.whenIdle()
    expect(store).toHaveBeenCalledWith(recipes)
  })

  it('does not start a second refresh while one is running', async () => {
    let release!: () => void
    const fetchList = vi.fn(
      () => new Promise<AhRecipeSummary[]>((resolve) => (release = () => resolve(recipes))),
    )
    const { refresher } = setup(fetchList)
    expect(refresher.maybeRefresh()).toBe(true)
    expect(refresher.maybeRefresh()).toBe(true)
    expect(fetchList).toHaveBeenCalledTimes(1)
    release()
    await refresher.whenIdle()
  })

  it('waits two minutes after the previous start before refreshing again', async () => {
    const { refresher, fetchList, advance } = setup()
    refresher.maybeRefresh()
    await refresher.whenIdle()

    advance(LIVE_REFRESH_MIN_INTERVAL_MS - 1)
    expect(refresher.maybeRefresh()).toBe(false)
    expect(fetchList).toHaveBeenCalledTimes(1)

    advance(1)
    expect(refresher.maybeRefresh()).toBe(true)
    await refresher.whenIdle()
    expect(fetchList).toHaveBeenCalledTimes(2)
  })

  it('keeps the cache when the live fetch fails', async () => {
    const { refresher, store, onError } = setup(vi.fn(async () => {
      throw new Error('AH onbereikbaar')
    }))
    refresher.maybeRefresh()
    await refresher.whenIdle()
    expect(store).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('does not store an empty list', async () => {
    const { refresher, store } = setup(vi.fn(async () => []))
    refresher.maybeRefresh()
    await refresher.whenIdle()
    expect(store).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/display-refresh.test.ts`
Expected: FAIL — `Failed to resolve import "./display-refresh"`.

- [ ] **Step 3: Write minimal implementation**

Maak `src/lib/display-refresh.ts`:

```ts
import type { AhRecipeSummary } from './ah'

export const LIVE_REFRESH_MIN_INTERVAL_MS = 2 * 60 * 1000

export type ListRefresherOptions = {
  fetchList: () => Promise<AhRecipeSummary[]>
  store: (recipes: AhRecipeSummary[]) => void
  now?: () => number
  minIntervalMs?: number
  onError?: (error: unknown) => void
}

export type ListRefresher = {
  maybeRefresh(): boolean
  whenIdle(): Promise<void>
}

// Ververst een lijst hoogstens één keer tegelijk en niet vaker dan
// minIntervalMs na de vorige start. De aanroeper wacht nooit: het display
// krijgt direct de cache en vraagt later nog één keer.
export function createListRefresher(options: ListRefresherOptions): ListRefresher {
  const now = options.now ?? Date.now
  const minIntervalMs = options.minIntervalMs ?? LIVE_REFRESH_MIN_INTERVAL_MS
  const onError =
    options.onError ??
    ((error: unknown) =>
      console.error('[display-refresh]', error instanceof Error ? error.message : error))

  let running: Promise<void> | null = null
  let lastStartedAt: number | null = null

  return {
    maybeRefresh() {
      if (running) return true
      if (lastStartedAt !== null && now() - lastStartedAt < minIntervalMs) return false

      lastStartedAt = now()
      running = options
        .fetchList()
        .then((recipes) => {
          if (recipes.length > 0) options.store(recipes)
        })
        .catch(onError)
        .finally(() => {
          running = null
        })
      return true
    },
    async whenIdle() {
      await running
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/display-refresh.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/display-refresh.ts src/lib/display-refresh.test.ts
git commit -m "feat: add single-flight rate-limited list refresher"
```

### Task 3: Verzamelplaatje samenstellen

**Files:**
- Create: `src/lib/display-sheet.ts`
- Test: `src/lib/display-sheet.test.ts`

**Interfaces:**
- Consumes: `renderThumbPng(imageUrl: string): Promise<Buffer>`, `thumbCacheFile(id: string, imageUrl: string): string`, `readCachedPng(fileName: string, freshSinceMs: number): Promise<Buffer | null>`, `writeCachedPng(fileName: string, png: Buffer): Promise<void>`, `THUMB_WIDTH = 96`, `THUMB_HEIGHT = 72` (allemaal uit `src/lib/recipe-render.ts`), `DISPLAY_PAGE_SIZE` (Task 1).
- Produces:
  - `SHEET_WIDTH = 96`, `SHEET_SLOT_HEIGHT = 72`, `SHEET_HEIGHT = 720`, `SHEET_EMPTY_RGB = [0x15, 0x15, 0x1f]`
  - `composeSheet(thumbs: Array<Buffer | null>): Buffer` — baseline-JPEG 96×720; slot *i* krijgt `thumbs[i]` als dat een decodeerbare 96×72-JPEG is, anders effen `#15151F`. Meer dan 10 thumbs → alleen de eerste 10.
  - `loadThumb(id: string, imageUrl: string): Promise<Buffer | null>` — uit de disk-cache, of renderen en cachen; bij elke fout of lege `imageUrl` → `null` (gelogd, niet gegooid).

- [ ] **Step 1: Write the failing test**

Maak `src/lib/display-sheet.test.ts`:

```ts
import { decode as jpegDecode, encode as jpegEncode } from 'jpeg-js'
import { describe, expect, it } from 'vitest'

import { SHEET_EMPTY_RGB, SHEET_HEIGHT, SHEET_WIDTH, composeSheet } from './display-sheet'

function solidJpeg(width: number, height: number, rgb: [number, number, number]) {
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = rgb[0]
    data[i * 4 + 1] = rgb[1]
    data[i * 4 + 2] = rgb[2]
    data[i * 4 + 3] = 255
  }
  return Buffer.from(jpegEncode({ data, width, height }, 95).data)
}

function pixel(image: { data: Uint8Array; width: number }, x: number, y: number) {
  const i = (y * image.width + x) * 4
  return [image.data[i], image.data[i + 1], image.data[i + 2]]
}

function close(actual: number[], expected: readonly number[]) {
  actual.forEach((value, i) => expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(8))
}

describe('composeSheet', () => {
  it('produces a 96x720 baseline JPEG', () => {
    const sheet = composeSheet([])
    expect(SHEET_WIDTH).toBe(96)
    expect(SHEET_HEIGHT).toBe(720)
    const decoded = jpegDecode(sheet, { useTArray: true })
    expect([decoded.width, decoded.height]).toEqual([96, 720])
    expect(sheet.includes(Buffer.from([0xff, 0xc0]))).toBe(true)
    expect(sheet.includes(Buffer.from([0xff, 0xc2]))).toBe(false)
  })

  it('places each thumbnail in its own 72px slot', () => {
    const red = solidJpeg(96, 72, [220, 20, 20])
    const green = solidJpeg(96, 72, [20, 200, 20])
    const decoded = jpegDecode(composeSheet([red, null, green]), { useTArray: true })
    close(pixel(decoded, 48, 36), [220, 20, 20])
    close(pixel(decoded, 48, 72 + 36), SHEET_EMPTY_RGB)
    close(pixel(decoded, 48, 144 + 36), [20, 200, 20])
    close(pixel(decoded, 48, 9 * 72 + 36), SHEET_EMPTY_RGB)
  })

  it('treats undecodable or wrongly sized thumbnails as empty', () => {
    const wrongSize = solidJpeg(50, 50, [220, 20, 20])
    const garbage = Buffer.from('geen jpeg')
    const decoded = jpegDecode(composeSheet([wrongSize, garbage]), { useTArray: true })
    close(pixel(decoded, 20, 20), SHEET_EMPTY_RGB)
    close(pixel(decoded, 20, 72 + 20), SHEET_EMPTY_RGB)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/display-sheet.test.ts`
Expected: FAIL — `Failed to resolve import "./display-sheet"`.

- [ ] **Step 3: Write minimal implementation**

Maak `src/lib/display-sheet.ts`:

```ts
import { decode as jpegDecode, encode as jpegEncode } from 'jpeg-js'

import { DISPLAY_PAGE_SIZE } from './display-recipes'
import {
  THUMB_HEIGHT,
  THUMB_WIDTH,
  readCachedPng,
  renderThumbPng,
  thumbCacheFile,
  writeCachedPng,
} from './recipe-render'

export const SHEET_WIDTH = THUMB_WIDTH
export const SHEET_SLOT_HEIGHT = THUMB_HEIGHT
export const SHEET_HEIGHT = SHEET_SLOT_HEIGHT * DISPLAY_PAGE_SIZE
export const SHEET_EMPTY_RGB = [0x15, 0x15, 0x1f] as const

// Eén plaatje per pagina i.p.v. tien losse: op het ESP32-P4-paneel gaf elke
// losse image-load een kans op een blauwe flits (gemeten 2026-09-29).
// Baseline + afmetingen die een veelvoud van 16 zijn.
export function composeSheet(thumbs: Array<Buffer | null>): Buffer {
  const data = Buffer.alloc(SHEET_WIDTH * SHEET_HEIGHT * 4)
  for (let i = 0; i < SHEET_WIDTH * SHEET_HEIGHT; i += 1) {
    data[i * 4] = SHEET_EMPTY_RGB[0]
    data[i * 4 + 1] = SHEET_EMPTY_RGB[1]
    data[i * 4 + 2] = SHEET_EMPTY_RGB[2]
    data[i * 4 + 3] = 255
  }

  thumbs.slice(0, DISPLAY_PAGE_SIZE).forEach((thumb, slot) => {
    if (!thumb) return
    let decoded: { width: number; height: number; data: Uint8Array }
    try {
      decoded = jpegDecode(thumb, { useTArray: true, formatAsRGBA: true })
    } catch {
      return
    }
    if (decoded.width !== SHEET_WIDTH || decoded.height !== SHEET_SLOT_HEIGHT) return
    const offset = slot * SHEET_SLOT_HEIGHT * SHEET_WIDTH * 4
    data.set(decoded.data, offset)
  })

  return Buffer.from(jpegEncode({ data, width: SHEET_WIDTH, height: SHEET_HEIGHT }, 80).data)
}

export async function loadThumb(id: string, imageUrl: string): Promise<Buffer | null> {
  if (!imageUrl) return null
  try {
    const fileName = thumbCacheFile(id, imageUrl)
    const cached = await readCachedPng(fileName, 0)
    if (cached) return cached
    const jpeg = await renderThumbPng(imageUrl)
    await writeCachedPng(fileName, jpeg)
    return jpeg
  } catch (error) {
    console.error(
      `[display-sheet] thumbnail ${id} mislukt`,
      error instanceof Error ? error.message : error,
    )
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/display-sheet.test.ts`
Expected: PASS, 3 tests. Faalt de baseline-assert (`0xFFC2` gevonden) of de kleurtolerantie van 8: dat is een aanname in dit plan over jpeg-js. Meld dan **BLOCKED** met de gemeten waarden; pas de test niet aan.

- [ ] **Step 5: Commit**

```bash
git add src/lib/display-sheet.ts src/lib/display-sheet.test.ts
git commit -m "feat: compose one thumbnail sheet per display page"
```

### Task 4: Display-endpoints

**Files:**
- Create: `src/app/api/display/recipes/route.ts`
- Create: `src/app/api/display/recipes/route.test.ts`
- Create: `src/app/api/display/recipes/sheet/route.ts`
- Create: `src/app/api/display/recipes/sheet/route.test.ts`
- Modify: `README.md` (sectie "Belangrijke endpoints")

**Interfaces:**
- Consumes: alles uit Task 1–3; `cacheRecipeList(listKey: string, recipes: AhRecipeSummary[]): void` (`src/lib/ah-cache.ts`); `fetchRecipesForList(client, listKey): Promise<{ recipes: AhRecipeSummary[] }>` (`src/lib/ah.ts`); `getAhClient()` (`src/lib/ah-client.ts`); `readCachedPng`/`writeCachedPng` (`src/lib/recipe-render.ts`).
- Produces (HTTP, gebruikt door Deel B):
  - `GET /api/display/recipes?list=&page=` → `200 { list, page, pages, total, version, refreshing, recipes: DisplayRecipe[] }`; onbekende list → `400 { error }`. Header `Cache-Control: no-store`.
  - `GET /api/display/recipes/sheet?list=&page=&v=` → `200 image/jpeg` (96×720); onbekende list → `400`. `v` wordt genegeerd: het plaatje hoort altijd bij de huidige inhoud. Cachebestand `sheet-<list>-<page>-<version>.jpg` in de bestaande render-cache.

- [ ] **Step 1: Write the failing tests**

Maak `src/app/api/display/recipes/route.test.ts`:

```ts
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchRecipesForList = vi.fn()

vi.mock('../../../../lib/ah-client', () => ({ getAhClient: () => ({}) }))
vi.mock('../../../../lib/ah', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/ah')>()),
  fetchRecipesForList,
}))

function summaries(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    title: `${prefix} ${i}`,
    duration: 10 + i,
    servings: 4,
    imageUrl: `https://static.ah.nl/${prefix}${i}.jpg`,
  }))
}

function get(query: string) {
  return new NextRequest(`http://recipe-hub.test/api/display/recipes?${query}`)
}

describe('GET /api/display/recipes', () => {
  beforeEach(() => {
    process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'display-recipes-'))
    fetchRecipesForList.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns one page of ten with totals and a version', async () => {
    const { cacheRecipeList } = await import('../../../../lib/ah-cache')
    cacheRecipeList('favorites', summaries('f', 23))
    const { GET } = await import('./route')

    const response = await GET(get('list=favorites&page=2'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(body).toMatchObject({ list: 'favorites', page: 2, pages: 3, total: 23, refreshing: false })
    expect(body.version).toMatch(/^[0-9a-f]{10}$/)
    expect(body.recipes).toEqual([
      { id: 'f20', title: 'f 20', duration: 30, servings: 4 },
      { id: 'f21', title: 'f 21', duration: 31, servings: 4 },
      { id: 'f22', title: 'f 22', duration: 32, servings: 4 },
    ])
    expect(fetchRecipesForList).not.toHaveBeenCalled()
  })

  it('rejects an unknown list', async () => {
    const { GET } = await import('./route')
    const response = await GET(get('list=all'))
    expect(response.status).toBe(400)
  })

  it('answers from cache and refreshes the cart list in the background on page 0', async () => {
    const { cacheRecipeList, getCachedRecipeList } = await import('../../../../lib/ah-cache')
    cacheRecipeList('cart', summaries('old', 3))
    fetchRecipesForList.mockResolvedValue({ recipes: summaries('new', 4) })
    const { GET, cartRefresher } = await import('./route')

    const body = await (await GET(get('list=cart&page=0'))).json()
    expect(body.refreshing).toBe(true)
    expect(body.recipes[0].id).toBe('old0')

    await cartRefresher.whenIdle()
    expect(fetchRecipesForList).toHaveBeenCalledWith(expect.anything(), 'cart')
    expect(getCachedRecipeList('cart').map((r) => r.id)).toEqual(['new0', 'new1', 'new2', 'new3'])
  })

  it('does not refresh the cart list for later pages or other lists', async () => {
    const { cacheRecipeList } = await import('../../../../lib/ah-cache')
    cacheRecipeList('cart', summaries('c', 15))
    cacheRecipeList('favorites', summaries('f', 3))
    const { GET } = await import('./route')

    expect((await (await GET(get('list=cart&page=1'))).json()).refreshing).toBe(false)
    expect((await (await GET(get('list=favorites&page=0'))).json()).refreshing).toBe(false)
    expect(fetchRecipesForList).not.toHaveBeenCalled()
  })
})
```

Maak `src/app/api/display/recipes/sheet/route.test.ts`:

```ts
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decode as jpegDecode } from 'jpeg-js'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GET /api/display/recipes/sheet', () => {
  beforeEach(() => {
    process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'display-sheet-'))
    // Geen netwerk in tests: elke thumbnail-fetch faalt, dus alle slots zijn leeg.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns a 96x720 jpeg for a page, even when thumbnails fail', async () => {
    const { cacheRecipeList } = await import('../../../../../lib/ah-cache')
    cacheRecipeList('favorites', [
      { id: '1', title: 'A', duration: 10, servings: 2, imageUrl: 'https://static.ah.nl/a.jpg' },
    ])
    const { GET } = await import('./route')

    const response = await GET(
      new NextRequest('http://recipe-hub.test/api/display/recipes/sheet?list=favorites&page=0&v=x'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    const decoded = jpegDecode(Buffer.from(await response.arrayBuffer()), { useTArray: true })
    expect([decoded.width, decoded.height]).toEqual([96, 720])
  })

  it('rejects an unknown list', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new NextRequest('http://recipe-hub.test/api/display/recipes/sheet?list=all&page=0'),
    )
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/display`
Expected: FAIL — `Failed to resolve import "./route"` in beide bestanden.

- [ ] **Step 3: Write the implementation**

Maak `src/app/api/display/recipes/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'

import { fetchRecipesForList } from '../../../../lib/ah'
import { getAhClient } from '../../../../lib/ah-client'
import { cacheRecipeList } from '../../../../lib/ah-cache'
import {
  isDisplayListKey,
  loadListRecipes,
  pageVersion,
  paginateRecipes,
  parsePageParam,
  toDisplayRecipe,
} from '../../../../lib/display-recipes'
import { createListRefresher } from '../../../../lib/display-refresh'

export const dynamic = 'force-dynamic'

// "Eerder toegevoegd" moet een recept dat net in de AH-app gekozen is snel
// tonen; de nachtelijke sync is daarvoor te traag. Favorieten blijven nachtelijk.
export const cartRefresher = createListRefresher({
  fetchList: async () => (await fetchRecipesForList(getAhClient(), 'cart')).recipes,
  store: (recipes) => cacheRecipeList('cart', recipes),
})

export async function GET(request: NextRequest) {
  const list = request.nextUrl.searchParams.get('list')
  if (!isDisplayListKey(list)) {
    return NextResponse.json({ error: 'Onbekende lijst' }, { status: 400 })
  }

  const { page, pages, total, items } = paginateRecipes(
    loadListRecipes(list),
    parsePageParam(request.nextUrl.searchParams.get('page')),
  )
  const refreshing = list === 'cart' && page === 0 ? cartRefresher.maybeRefresh() : false

  return NextResponse.json(
    {
      list,
      page,
      pages,
      total,
      version: pageVersion(items),
      refreshing,
      recipes: items.map(toDisplayRecipe),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
```

Maak `src/app/api/display/recipes/sheet/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'

import {
  isDisplayListKey,
  loadListRecipes,
  pageVersion,
  paginateRecipes,
  parsePageParam,
} from '../../../../../lib/display-recipes'
import { composeSheet, loadThumb } from '../../../../../lib/display-sheet'
import { readCachedPng, writeCachedPng } from '../../../../../lib/recipe-render'

export const dynamic = 'force-dynamic'

function jpegResponse(jpeg: Buffer) {
  return new NextResponse(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: NextRequest) {
  const list = request.nextUrl.searchParams.get('list')
  if (!isDisplayListKey(list)) {
    return NextResponse.json({ error: 'Onbekende lijst' }, { status: 400 })
  }

  // `v` uit de URL wordt bewust genegeerd: het plaatje hoort altijd bij de
  // huidige inhoud, het display gebruikt v alleen om zijn eigen cache te breken.
  const { page, items } = paginateRecipes(
    loadListRecipes(list),
    parsePageParam(request.nextUrl.searchParams.get('page')),
  )
  const fileName = `sheet-${list}-${page}-${pageVersion(items)}.jpg`

  const cached = await readCachedPng(fileName, 0)
  if (cached) return jpegResponse(cached)

  const thumbs = await Promise.all(items.map((recipe) => loadThumb(recipe.id, recipe.imageUrl)))
  const sheet = composeSheet(thumbs)
  // Alleen cachen als elke thumbnail er was; anders blijft een tijdelijke
  // storing als donkere vlakken hangen tot de inhoud verandert.
  if (thumbs.every((thumb) => thumb !== null)) await writeCachedPng(fileName, sheet)
  return jpegResponse(sheet)
}
```

Voeg in `README.md` onder "Belangrijke endpoints", direct na de regel met `/api/ah/favorites`, toe:

```markdown
- `GET /api/display/recipes?list=cart|favorites|custom&page=0` - display-contract: 10 recepten per pagina met `version`; ververst `cart` live op pagina 0 (hoogstens 1× per 2 min).
- `GET /api/display/recipes/sheet?list=…&page=…&v=…` - één 96x720 JPEG met de 10 thumbnails van die pagina, onder elkaar.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS — **10 files, 46 tests** (22 baseline + 9 + 6 + 3 + 4 + 2). Wijkt het aantal af, zoek uit waarom vóórdat je verdergaat.

Run: `npx tsc --noEmit`
Expected: geen fouten.

Run: `npm run build`
Expected: build slaagt, de uitvoer noemt `/api/display/recipes` en `/api/display/recipes/sheet`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/display README.md
git commit -m "feat: add paged display recipe and thumbnail sheet endpoints"
```

### Checkpoint A: review en deploy (Claude + Tom, niet gedelegeerd)

- [ ] Claude reviewt de diff van `main..feat/display-recipe-sheet`.
- [ ] Tom geeft akkoord op mergen naar `main`, pushen naar `origin` en de Coolify-redeploy.
- [ ] Na de deploy: controleer dat de image-tag in Coolify de nieuwe commit-hash is. Coolify rolt pushes niet vanzelf uit.
- [ ] Live verifiëren:

```bash
curl -s "http://192.168.1.237:3002/api/display/recipes?list=cart&page=0" | python3 -m json.tool | head -20
curl -s -o /tmp/sheet.jpg -w "%{http_code} %{size_download}\n" "http://192.168.1.237:3002/api/display/recipes/sheet?list=favorites&page=0"
file /tmp/sheet.jpg
```

Expected: JSON met `pages`, `version`, maximaal 10 `recipes`; plaatje `200`, `JPEG image data, baseline … 96x720`.

---

## Deel B — ha_display_7inch

Werk in `/Volumes/2TB/Development/Projects/AI_APP/ha_display_7inch`:

```bash
git stash push esphome/ha-display-7.yaml -m "tom: stroomprijs sensor"
git checkout -b feat/recipe-sheet-list
git stash pop
```

`git stash pop` moet schoon toepassen. De stroomprijs-regel blijft een niet-gecommitte wijziging; commit in dit deel **nooit** met `git add -A` of `git commit -a`. Stage bestanden met `git add -p` en sla de hunk met `sensor.energie_huidige_onbalansprijs_all_in` over.

### Task 5: Statische YAML-controle (rood)

**Files:**
- Create: `tests/check_recipe_sheet_list.sh`
- Modify: `tests/check_image_load_stability.sh`

**Interfaces:**
- Produces: de ids en patronen die Task 6 moet opleveren: `recipe_sheet`, `recipe_list_load`, `recipe_list_step`, `recipe_list_select_tab`, `recipe_list_recheck`, `recipe_tab_colors`, `recipe_sheet_pending`, `recipe_back_from_detail`, `lbl_recipe_count`, `lbl_recipe_page`, `btn_recipe_prev`, `btn_recipe_next`, `btn_recept_1`…`btn_recept_10`.

- [ ] **Step 1: Write the failing check**

Maak `tests/check_recipe_sheet_list.sh` (en `chmod +x`):

```bash
#!/usr/bin/env bash
set -euo pipefail

root_dir=$(cd "$(dirname "$0")/.." && pwd)
yaml="$root_dir/esphome/ha-display-7.yaml"

require() {
  if ! rg -q --multiline "$1" "$yaml"; then
    echo "FAIL: $2" >&2
    exit 1
  fi
}

reject() {
  if rg -q --multiline "$1" "$yaml"; then
    echo "FAIL: $2" >&2
    exit 1
  fi
}

require 'id: recipe_sheet\n' 'one artwork_image for the thumbnail sheet'
require 'resize: 96x720' 'the sheet is 96x720'
require 'id: recipe_sheet\n(?:    .*\n)*?    hardware_acceleration: false' 'the sheet uses software decode'
require '/api/display/recipes\?list=%s&page=%d' 'the list is fetched from recipe-hub directly'
require '/api/display/recipes/sheet\?list=%s&page=%d&v=%s' 'the sheet url carries list, page and version'
require 'id: btn_recept_10\n' 'ten recipe cards'
reject 'id: btn_recept_11\n' 'no more than ten recipe cards'
require 'lv_image_set_offset_y\(imgs\[i\], -72 \* i\)' 'each card shows its own slice of the sheet'
require 'id: recipe_back_from_detail' 'back from detail keeps the current page'
require 'id\(recipe_list_step\)->execute\(swipe_left \? 1 : -1\)' 'mid-screen swipe pages through recipes'
reject 'ha_recept_' 'no Home Assistant recipe slot sensors'
reject 'recipe_thumb_' 'no per-recipe thumbnail components'
reject 'input_select\.ah_recipe_tab' 'the tab is kept on the display'
reject 'ah_recipes_dirty' 'no HA text batching'

echo 'PASS: recipe list pages come from recipe-hub with one thumbnail sheet'
```

Vervang in `tests/check_image_load_stability.sh` deze drie regels:

```bash
require 'id: recipe_thumb_loaded_ids' 'loaded recipe identities must be retained'
require 'if \(!id\(recipe_list_page_active\)\) return;' 'recipe thumbnail dispatch must be gated by page visibility'
require 'id\(recipe_thumb_loaded_ids\)\[i\] = id\(recipe_thumb_inflight_id\);' 'successful thumbnail callbacks must record their recipe identity'
```

door:

```bash
require 'if \(!id\(recipe_sheet_pending\) \|\| !id\(recipe_list_page_active\) \|\| id\(artwork_busy\)\) return;' 'the recipe sheet loads only when visible and the artwork lock is free'
require 'if \(id\(recipe_sheet\)->get_url\(\) != id\(recipe_sheet_desired_url\)\) return;' 'a stale sheet is never applied after paging on'
```

- [ ] **Step 2: Run to verify both fail**

Run: `bash tests/check_recipe_sheet_list.sh; bash tests/check_image_load_stability.sh`
Expected: beide `FAIL:` (de eerste op `one artwork_image for the thumbnail sheet`, de tweede op `the recipe sheet loads only when visible…`).

- [ ] **Step 3: Commit**

```bash
git add tests/check_recipe_sheet_list.sh tests/check_image_load_stability.sh
git commit -m "test: expect recipe list pages with one thumbnail sheet"
```

### Task 6: YAML-migratie

**Files:**
- Create: `tools/migrate_recipe_list.py`
- Modify: `esphome/ha-display-7.yaml` (alleen via het script)

**Interfaces:**
- Consumes: de ids uit Task 5; bestaande ids die blijven: `recipe_list_page_active`, `artwork_busy`, `last_touch_was_swipe`, `nav_overlay_show`, `recipe_load_current`, `ah_current_step`, `ah_current_recipe_id`, `ah_recipe_page_active`, `nav_overlay_countdown`, `nav_rail_container`, `top_status_bar`, `lbl_recipe_loading`, `page_recipe_detail`, `btn_recipe_tab_cart`, `btn_recipe_tab_favorites`, `btn_recipe_tab_custom`, `goto_page`.
- Produces: een config die `esphome config` en `esphome compile` doorstaat, en beide checks uit Task 5 groen.

- [ ] **Step 1: Write the migration script**

Maak `tools/migrate_recipe_list.py`:

```python
#!/usr/bin/env python3
"""Eenmalige migratie (2026-09-29): receptenlijst van 24 HA-sensorslots naar
pagina's van 10 uit recipe-hub met één verzamelplaatje. Elk anker moet exact
één keer voorkomen; zo niet, dan stopt het script zonder te schrijven."""
import re
from pathlib import Path

YAML = Path(__file__).resolve().parents[1] / "esphome" / "ha-display-7.yaml"
s = YAML.read_text()


def replace_once(old: str, new: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"anker {count}x gevonden (verwacht 1): {old[:70]!r}")
    s = s.replace(old, new)


def cut_between(start: str, end: str, replacement: str) -> None:
    """Vervang alles vanaf `start` tot (niet inclusief) `end`."""
    global s
    if s.count(start) < 1:
        raise SystemExit(f"start-anker ontbreekt: {start[:70]!r}")
    i = s.index(start)
    j = s.index(end, i)
    s = s[:i] + replacement + s[j:]


# 1. Globals: oude thumbnail/HA-batching weg, nieuwe lijststatus erbij.
for gid in (
    "ah_recipes_dirty",
    "recipe_thumb_pending",
    "recipe_thumb_inflight",
    "recipe_thumb_inflight_id",
    "recipe_thumb_loaded_ids",
):
    s, n = re.subn(rf"  - id: {gid}\n(?:    .*\n)+", "", s)
    if n != 1:
        raise SystemExit(f"global {gid}: {n}x verwijderd (verwacht 1)")

NEW_GLOBALS = """  - id: recipe_list_tab
    # 0 = Eerder toegevoegd (cart), 1 = Favorieten, 2 = Eigen recepten
    type: int
    restore_value: yes
    initial_value: '0'
  - id: recipe_list_page
    type: int
    restore_value: no
    initial_value: '0'
  - id: recipe_list_pages
    type: int
    restore_value: no
    initial_value: '1'
  - id: recipe_list_loaded_key
    type: std::string
    restore_value: no
    initial_value: '""'
  - id: recipe_list_ids
    type: std::vector<std::string>
    restore_value: no
    initial_value: 'std::vector<std::string>(10)'
  - id: recipe_list_recheck_allowed
    type: bool
    restore_value: no
    initial_value: 'false'
  - id: recipe_back_from_detail
    type: bool
    restore_value: no
    initial_value: 'false'
  - id: recipe_sheet_pending
    type: bool
    restore_value: no
    initial_value: 'false'
  - id: recipe_sheet_desired_url
    type: std::string
    restore_value: no
    initial_value: '""'
"""
replace_once(
    "  - id: recipe_list_page_active\n    type: bool\n    restore_value: no\n    initial_value: 'false'\n",
    "  - id: recipe_list_page_active\n    type: bool\n    restore_value: no\n    initial_value: 'false'\n"
    + NEW_GLOBALS,
)

# 2. text_sensor: ha_ah_favorites (ongebruikt), ha_recipe_tab en de 96 slotsensoren.
cut_between(
    "  - platform: homeassistant\n    id: ha_ah_favorites\n",
    "\nbinary_sensor:\n",
    "",
)

# 3. artwork_image: 24 thumbnails eruit, één verzamelplaatje erin.
IMGS = ", ".join(f"id(img_recept_{n})" for n in range(1, 11))
RECIPE_SHEET = f"""  # Eén plaatje per receptenpagina: 10 thumbnails van 96x72 onder elkaar.
  # Losse thumbnail-loads gaven per load kans op een blauwe flits; één load per
  # pagina met software-decode flitste niet (gemeten op het paneel, 2026-09-29).
  - id: recipe_sheet
    url: "http://192.168.1.237:3002/api/display/recipes/sheet"
    format: JPEG
    type: RGB565
    byte_order: LITTLE_ENDIAN
    resize: 96x720
    hardware_acceleration: false
    allow_insecure_local_urls: true
    update_interval: never
    on_download_finished:
      - lambda: |-
          id(artwork_busy) = false;
          // Intussen verder gebladerd: dit plaatje hoort niet meer bij de kaarten.
          if (id(recipe_sheet)->get_url() != id(recipe_sheet_desired_url)) return;
          static lv_obj_t *const imgs[10] = {{{IMGS}}};
          for (int i = 0; i < 10; i++) {{
            lv_image_set_src(imgs[i], id(recipe_sheet)->get_lv_image_dsc());
            lv_image_set_inner_align(imgs[i], LV_IMAGE_ALIGN_TOP_LEFT);
            lv_image_set_offset_y(imgs[i], -72 * i);
            if (!id(recipe_list_ids)[i].empty()) lv_obj_clear_flag(imgs[i], LV_OBJ_FLAG_HIDDEN);
          }}
    on_error:
      - lambda: |-
          id(artwork_busy) = false;
          // Volgende keer openen/bladeren opnieuw proberen.
          id(recipe_list_loaded_key).clear();
      - logger.log: "Receptenplaatje laad fout"
"""
cut_between("  - id: recipe_thumb_1\n", "# Let op: recipe_header_art", RECIPE_SHEET)

# 4. interval: thumbnail-dispatcher en HA-tekstbatching eruit, plaatjes-dispatcher erin.
SHEET_DISPATCHER = """  # Receptenplaatje laden zodra de pagina zichtbaar is en geen andere
  # artwork-decode loopt (globale artwork_busy-vergrendeling).
  - interval: 100ms
    then:
      - lambda: |-
          if (!id(recipe_sheet_pending) || !id(recipe_list_page_active) || id(artwork_busy)) return;
          id(recipe_sheet_pending) = false;
          id(artwork_busy) = true;
          id(recipe_sheet)->set_url(id(recipe_sheet_desired_url));
          id(recipe_sheet)->update();

"""
cut_between(
    "  # Recipe thumbnails één voor één downloaden",
    "  # Immich overlay timeout",
    SHEET_DISPATCHER,
)


# 5. De receptenpagina zelf.
def card(n: int) -> str:
    i = n - 1
    x = 32 if i % 2 == 0 else 528
    y = 74 + (i // 2) * 96
    return f"""              - button:
                  id: btn_recept_{n}
                  x: {x}
                  y: {y}
                  width: 464
                  height: 86
                  radius: 8
                  bg_color: 0x15151F
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x28283A
                  pad_all: 0
                  scrollable: false
                  hidden: true
                  on_click:
                    - if:
                        condition:
                          lambda: 'return !id(last_touch_was_swipe) && !id(recipe_list_ids)[{i}].empty();'
                        then:
                          - lambda: 'id(ah_current_step) = 0; id(ah_current_recipe_id) = id(recipe_list_ids)[{i}]; id(ah_recipe_page_active) = true; id(recipe_list_page_active) = false; id(nav_overlay_countdown) = 0;'
                          - lvgl.widget.hide: nav_rail_container
                          - lvgl.widget.hide: top_status_bar
                          - lvgl.widget.show: lbl_recipe_loading
                          - lvgl.page.show: page_recipe_detail
                          - script.execute: recipe_load_current
                  widgets:
                    - image:
                        id: img_recept_{n}
                        x: 8
                        y: 7
                        width: 96
                        height: 72
                        src: recipe_sheet
                        hidden: true
                    - label:
                        id: lbl_recept_{n}_title
                        x: 122
                        y: 14
                        width: 320
                        text_font: font_roboto_16
                        text_color: 0xF2F2F2
                        long_mode: DOT
                        text: ""
                    - label:
                        id: lbl_recept_{n}_meta
                        x: 122
                        y: 48
                        width: 240
                        text_font: font_roboto_16
                        text_color: 0xA0A0A0
                        long_mode: DOT
                        text: ""
"""


def tab(button_id: str, x: int, width: int, text: str, index: int, active: bool) -> str:
    bg = "0xFF9020" if active else "0x15151F"
    border = "0xFF9020" if active else "0x28283A"
    return f"""              - button:
                  id: {button_id}
                  x: {x}
                  y: 18
                  width: {width}
                  height: 42
                  radius: 8
                  bg_color: {bg}
                  bg_opa: COVER
                  border_width: 1
                  border_color: {border}
                  pad_all: 0
                  on_click:
                    - if:
                        condition:
                          lambda: 'return !id(last_touch_was_swipe);'
                        then:
                          - script.execute: nav_overlay_show
                          - script.execute:
                              id: recipe_list_select_tab
                              tab: {index}
                  widgets:
                    - label:
                        align: CENTER
                        text_font: font_roboto_16
                        text_color: 0xFFFFFF
                        text: "{text}"
"""


def pager(button_id: str, label_id: str, x: int, text: str, delta: int) -> str:
    return f"""              - button:
                  id: {button_id}
                  x: {x}
                  y: 556
                  width: 200
                  height: 40
                  radius: 8
                  bg_color: 0x15151F
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x28283A
                  pad_all: 0
                  on_click:
                    - script.execute:
                        id: recipe_list_step
                        delta: {delta}
                  widgets:
                    - label:
                        id: {label_id}
                        align: CENTER
                        text_font: font_roboto_16
                        text_color: 0x555566
                        text: "{text}"
"""


PAGE = (
    """    # ===========================================================
    # PAGINA 6: AH RECEPTEN — 10 per pagina uit recipe-hub
    # ===========================================================
    - id: page_recepten
      bg_color: 0x000000
      bg_opa: COVER
      scrollable: false
      widgets:
        - obj:
            x: 0
            y: 0
            width: 1024
            height: 600
            bg_color: 0x000000
            bg_opa: COVER
            border_width: 0
            pad_all: 0
            scrollable: false
            on_click:
              - if:
                  condition:
                    lambda: 'return !id(last_touch_was_swipe);'
                  then:
                    - script.execute: nav_overlay_show
            widgets:
              - label:
                  x: 32
                  y: 22
                  text_font: font_roboto_28
                  text_color: 0xFFFFFF
                  text: "Recepten"
              - label:
                  id: lbl_recipe_count
                  x: 190
                  y: 30
                  width: 160
                  long_mode: DOT
                  text_font: font_roboto_16
                  text_color: 0xFF9020
                  text: ""
"""
    + tab("btn_recipe_tab_cart", 360, 232, "Eerder toegevoegd", 0, True)
    + tab("btn_recipe_tab_favorites", 604, 168, "Favorieten", 1, False)
    + tab("btn_recipe_tab_custom", 784, 168, "Eigen", 2, False)
    + "".join(card(n) for n in range(1, 11))
    + pager("btn_recipe_prev", "lbl_recipe_prev", 32, "‹  Vorige", -1)
    + """              - label:
                  id: lbl_recipe_page
                  x: 262
                  y: 566
                  width: 500
                  text_align: CENTER
                  text_font: font_roboto_16
                  text_color: 0xA0A0A0
                  text: ""
"""
    + pager("btn_recipe_next", "lbl_recipe_next", 792, "Volgende  ›", 1)
    + "\n\n"
)
cut_between(
    "    # ===========================================================\n    # PAGINA 6: AH RECEPTEN",
    "    # ===========================================================\n    # PAGINA 7: KEUKENTIMER",
    PAGE,
)

# 6. goto_page: openen = pagina 1 van de laatst gekozen tab; terug uit detail = niets herladen.
replace_once(
    """      - if:
          condition:
            lambda: 'return page_index == 5;'
          then:
            - lvgl.page.show: page_recepten
""",
    """      - if:
          condition:
            lambda: 'return page_index == 5;'
          then:
            - lvgl.page.show: page_recepten
            - if:
                condition:
                  lambda: 'return id(recipe_back_from_detail);'
                then:
                  - lambda: 'id(recipe_back_from_detail) = false;'
                else:
                  - lambda: 'id(recipe_list_page) = 0; id(recipe_list_recheck_allowed) = true;'
                  - script.execute: recipe_tab_colors
                  - script.execute: recipe_list_load
""",
)

# 7. Terug-knop in het detail.
replace_once(
    """            on_click:
              then:
                - script.execute:
                    id: goto_page
                    page_index: 5
""",
    """            on_click:
              then:
                - lambda: 'id(recipe_back_from_detail) = true;'
                - script.execute:
                    id: goto_page
                    page_index: 5
""",
)

# 8. Swipe midden op de receptenpagina bladert; de randen houden hun functie.
replace_once(
    "          if (abs_dx >= 55 && abs_dx > abs_dy) {\n",
    """          if (horizontal_swipe && id(recipe_list_page_active) && !id(spotify_drawer_open) &&
              !from_left_edge && !from_right_edge) {
            id(recipe_list_step)->execute(swipe_left ? 1 : -1);
            return;
          }
          if (abs_dx >= 55 && abs_dx > abs_dy) {
""",
)

# 9. Scripts voor laden, bladeren en tabs.
CARDS = ", ".join(f"id(btn_recept_{n})" for n in range(1, 11))
TITLES = ", ".join(f"id(lbl_recept_{n}_title)" for n in range(1, 11))
METAS = ", ".join(f"id(lbl_recept_{n}_meta)" for n in range(1, 11))
SCRIPTS = f"""  - id: recipe_tab_colors
    then:
      - lambda: |-
          static lv_obj_t *const tabs[3] = {{id(btn_recipe_tab_cart), id(btn_recipe_tab_favorites), id(btn_recipe_tab_custom)}};
          for (int i = 0; i < 3; i++) {{
            const bool active = (i == id(recipe_list_tab));
            lv_obj_set_style_bg_color(tabs[i], lv_color_hex(active ? 0xFF9020 : 0x15151F), LV_PART_MAIN);
            lv_obj_set_style_border_color(tabs[i], lv_color_hex(active ? 0xFF9020 : 0x28283A), LV_PART_MAIN);
          }}

  - id: recipe_list_select_tab
    parameters:
      tab: int
    then:
      - lambda: 'id(recipe_list_tab) = tab; id(recipe_list_page) = 0; id(recipe_list_recheck_allowed) = true;'
      - script.execute: recipe_tab_colors
      - script.execute: recipe_list_load

  - id: recipe_list_step
    parameters:
      delta: int
    then:
      - if:
          condition:
            lambda: |-
              const int next = id(recipe_list_page) + delta;
              return next >= 0 && next < id(recipe_list_pages);
          then:
            - lambda: 'id(recipe_list_page) += delta;'
            - script.execute: recipe_list_load

  # recipe-hub ververst "Eerder toegevoegd" op de achtergrond; één keer
  # opnieuw vragen haalt een net in de AH-app gekozen recept binnen.
  - id: recipe_list_recheck
    mode: restart
    then:
      - delay: 5s
      - if:
          condition:
            lambda: 'return id(recipe_list_page_active) && id(recipe_list_page) == 0;'
          then:
            - script.execute: recipe_list_load

  # restart: snel doorbladeren laadt alleen de laatst gekozen pagina.
  - id: recipe_list_load
    mode: restart
    then:
      - http_request.get:
          url: !lambda |-
            static const char *const lists[3] = {{"cart", "favorites", "custom"}};
            const int tab = (id(recipe_list_tab) >= 0 && id(recipe_list_tab) <= 2) ? id(recipe_list_tab) : 0;
            char url[128];
            snprintf(url, sizeof(url), "http://192.168.1.237:3002/api/display/recipes?list=%s&page=%d",
                     lists[tab], id(recipe_list_page));
            return std::string(url);
          capture_response: true
          max_response_buffer_size: 8kB
          on_response:
            then:
              - lambda: |-
                  if (response->status_code != 200) {{
                    ESP_LOGW("recipe_list", "lijst ophalen mislukt: %d", response->status_code);
                    lv_label_set_text(id(lbl_recipe_count), "Niet bereikbaar");
                    return;
                  }}
                  static lv_obj_t *const cards[10] = {{{CARDS}}};
                  static lv_obj_t *const titles[10] = {{{TITLES}}};
                  static lv_obj_t *const metas[10] = {{{METAS}}};
                  static lv_obj_t *const imgs[10] = {{{IMGS}}};
                  static const char *const lists[3] = {{"cart", "favorites", "custom"}};
                  bool refreshing = false;
                  const bool ok = json::parse_json(body, [&](JsonObject root) -> bool {{
                    const int page = root["page"] | 0;
                    const int pages = root["pages"] | 1;
                    const int total = root["total"] | 0;
                    const std::string version = root["version"] | "";
                    refreshing = root["refreshing"] | false;
                    const int tab = (id(recipe_list_tab) >= 0 && id(recipe_list_tab) <= 2) ? id(recipe_list_tab) : 0;

                    id(recipe_list_page) = page;
                    id(recipe_list_pages) = pages < 1 ? 1 : pages;
                    char buf[48];
                    snprintf(buf, sizeof(buf), "%d recepten", total);
                    lv_label_set_text(id(lbl_recipe_count), buf);
                    snprintf(buf, sizeof(buf), "Pagina %d van %d", page + 1, id(recipe_list_pages));
                    lv_label_set_text(id(lbl_recipe_page), buf);
                    lv_obj_set_style_text_color(id(lbl_recipe_prev),
                        lv_color_hex(page > 0 ? 0xFFFFFF : 0x555566), LV_PART_MAIN);
                    lv_obj_set_style_text_color(id(lbl_recipe_next),
                        lv_color_hex(page + 1 < id(recipe_list_pages) ? 0xFFFFFF : 0x555566), LV_PART_MAIN);

                    // Ongewijzigde pagina (zelfde tab, pagina en versie): niets hertekenen.
                    char key[64];
                    snprintf(key, sizeof(key), "%d:%d:%s", tab, page, version.c_str());
                    if (id(recipe_list_loaded_key) == key) return true;
                    id(recipe_list_loaded_key) = key;

                    JsonArray recipes = root["recipes"].as<JsonArray>();
                    for (int i = 0; i < 10; i++) {{
                      lv_obj_add_flag(imgs[i], LV_OBJ_FLAG_HIDDEN);
                      if (i < (int) recipes.size()) {{
                        JsonObject recipe = recipes[i];
                        id(recipe_list_ids)[i] = recipe["id"] | "";
                        lv_label_set_text(titles[i], recipe["title"] | "");
                        snprintf(buf, sizeof(buf), "%d min  \\xc2\\xb7  %d p",
                                 (int) (recipe["duration"] | 0), (int) (recipe["servings"] | 0));
                        lv_label_set_text(metas[i], buf);
                        lv_obj_clear_flag(cards[i], LV_OBJ_FLAG_HIDDEN);
                      }} else {{
                        id(recipe_list_ids)[i].clear();
                        lv_obj_add_flag(cards[i], LV_OBJ_FLAG_HIDDEN);
                      }}
                    }}

                    char url[160];
                    snprintf(url, sizeof(url),
                             "http://192.168.1.237:3002/api/display/recipes/sheet?list=%s&page=%d&v=%s",
                             lists[tab], page, version.c_str());
                    id(recipe_sheet_desired_url) = url;
                    id(recipe_sheet_pending) = true;
                    return true;
                  }});
                  if (!ok) {{
                    lv_label_set_text(id(lbl_recipe_count), "Niet bereikbaar");
                    return;
                  }}
                  if (refreshing && id(recipe_list_page) == 0 && id(recipe_list_recheck_allowed)) {{
                    id(recipe_list_recheck_allowed) = false;
                    id(recipe_list_recheck).execute();
                  }}
          on_error:
            then:
              - lambda: |-
                  ESP_LOGW("recipe_list", "recipe-hub niet bereikbaar");
                  lv_label_set_text(id(lbl_recipe_count), "Niet bereikbaar");

"""
replace_once("  - id: recipe_load_current\n", SCRIPTS + "  - id: recipe_load_current\n")

YAML.write_text(s)
print(f"OK: {YAML} gemigreerd")
```

Let op het verschil tussen `\\xc2\\xb7` in het Python-bestand (een f-string) en `\xc2\xb7` in de resulterende YAML. Het resultaat moet in de YAML precies `"%d min  \xc2\xb7  %d p"` zijn, net zoals de bestaande `recipe_load_current` het middelpunt schrijft.

- [ ] **Step 2: Run the migration**

Run: `python3 tools/migrate_recipe_list.py`
Expected: `OK: …/esphome/ha-display-7.yaml gemigreerd`. Een `anker …x gevonden` betekent dat de YAML afwijkt van wat dit plan verwacht. Draai dan niets handmatig bij, maar meld **BLOCKED** met de melding en de omliggende regels (`grep -n`).

Controleer daarna dat Toms stroomprijs-regel er nog in staat:

Run: `git diff esphome/ha-display-7.yaml | grep -c "energie_huidige_onbalansprijs_all_in"`
Expected: `1`.

- [ ] **Step 3: Run the static checks**

Run: `bash tests/check_recipe_sheet_list.sh && bash tests/check_image_load_stability.sh && for t in tests/check_*.sh; do bash "$t" >/dev/null || echo "FAIL $t"; done`
Expected: beide `PASS:`-regels en geen `FAIL`-regel. Controleer het resultaat van de lus: de andere checks mogen ook niet rood worden.

- [ ] **Step 4: Validate and compile**

Run: `cd esphome && esphome config ha-display-7.yaml > /dev/null && echo CONFIG-OK`
Expected: `CONFIG-OK`.

Run: `cd esphome && esphome compile ha-display-7.yaml 2>&1 | tail -3`
Expected: `[SUCCESS]`. Een compileerfout in een van de lambda's: los hem op **in `tools/migrate_recipe_list.py`**, zet de YAML terug met `git checkout -p esphome/ha-display-7.yaml` (bewaar de stroomprijs-hunk) en draai het script opnieuw. Zo blijft het script het ware verslag van de ingreep.

Run: `grep -c "" esphome/ha-display-7.yaml`
Expected: ruwweg 9.000–9.500 regels (was 12.612).

- [ ] **Step 5: Commit (zonder de stroomprijs-hunk)**

```bash
git add tools/migrate_recipe_list.py
git add -p esphome/ha-display-7.yaml   # alle hunks 'y', behalve de hunk met energie_huidige_onbalansprijs_all_in: 'n'
git diff --cached --stat
git commit -m "feat: page the recipe list from recipe-hub with one thumbnail sheet"
git diff --stat   # moet nu alleen de stroomprijs-regel tonen
```

### Checkpoint B: op het paneel (Claude + Tom, niet gedelegeerd)

Vereist dat Checkpoint A live staat. Flashen alleen na akkoord van Tom.

- [ ] `esphome run esphome/ha-display-7.yaml --device 192.168.1.186 --no-logs`, daarna logs meelezen.
- [ ] Met Tom: geen flits bij openen, bij 5× bladeren (knoppen en swipe) en bij 3 tabwissels.
- [ ] In de logs: pagina-JSON plus plaatje samen ≤ ~0,5 s na openen of bladeren.
- [ ] Tom kiest een recept in de AH-app, opent de pagina → het recept staat binnen ~10 s bovenaan "Eerder toegevoegd".
- [ ] Detail openen vanaf pagina 3 of later toont het juiste recept; terug komt uit op dezelfde pagina.
- [ ] Randzones: swipe vanaf de rechterrand opent nog steeds de Spotify-drawer, en vanaf de linkerrand de navigatie.

### Task 7: Home Assistant opruimen (pas na Checkpoint B en akkoord van Tom)

**Files:**
- Modify: `home-assistant/ha-display-7-package.yaml`

- [ ] **Step 1: Controle in de live HA (Claude met Tom)**

Zoek in de live configuratie (dashboards, automatiseringen, scripts) naar `ah_recept_`, `ah_cart_raw`, `ah_favorites_raw`, `ah_custom_raw`, `ah_recipe_tab` en `recipe_hub_custom_recipes_changed`. Noteer per treffer waar hij staat.

- [ ] **Step 2: Package aanpassen**

Geen andere gebruikers gevonden: verwijder uit `home-assistant/ha-display-7-package.yaml` de drie `rest`-resources voor `ah/recipes?list=cart`, `ah/favorites` en `ah/recipes?list=custom`, het `input_select.ah_recipe_tab`-blok en alle template-sensoren `ah_recept_1_*` … `ah_recept_24_*`.

Wel andere gebruikers: verwijder alleen het `input_select` en de template-sensoren.

Run: `grep -cE "ah_recept_|ah_recipe_tab" home-assistant/ha-display-7-package.yaml`
Expected: `0`.

- [ ] **Step 3: Deploy en recipe-hub-webhook**

Deploy het package naar HA op dezelfde manier als eerdere package-wijzigingen (`deploy-to-ha.sh`, na akkoord van Tom). Verwijder in HA de automatisering die op webhook `recipe_hub_custom_recipes_changed` luistert. Maak in Coolify `HOME_ASSISTANT_CUSTOM_RECIPES_WEBHOOK_URL` leeg (de code doet dan niets, zie `custom-recipe-sync.ts`).

- [ ] **Step 4: Commit**

```bash
git add home-assistant/ha-display-7-package.yaml
git commit -m "chore: remove Home Assistant recipe sensors now the display reads recipe-hub"
```
