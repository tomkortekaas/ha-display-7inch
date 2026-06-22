# AH Recepten Scherm — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een receptenscherm toe aan de 7" ESPHome display waarmee je AH-favorietenrecepten kunt bekijken tijdens het koken.

**Architecture:** De LVGL favorietenlijst leest data uit een HA text_sensor (gevuld door een REST sensor die de Next.js API pollt). Aantikken van een recept laadt een 1024×600 PNG via het `artwork_image` component; de PNG wordt server-side gerenderd door Next.js met satori. Navigeren tussen bereidingsstappen verhoogt een global en triggert een nieuwe download.

**Tech Stack:** TypeScript (Next.js App Router API routes), satori + @resvg-js/resvg-js (PNG rendering), ESPHome LVGL YAML, Home Assistant REST sensor.

---

## Bestandsoverzicht

**Nieuw:**
- `photo-swipe-patch/src/app/api/ah/favorites/route.ts` — AH login + favorietenlijst als JSON
- `photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts` — recept PNG renderer (split: ingrediënten + stap N)

**Gewijzigd:**
- `esphome/ha-display-7.yaml` — globals, text_sensor, artwork_image, nav rail knop, page_recepten
- `home-assistant/ha-display-7-package.yaml` — REST sensor `sensor.ah_favorites`
- `deploy-to-ha.sh` — deployment van nieuwe API routes

---

## Task 1: AH Favorites API route

**Files:**
- Create: `photo-swipe-patch/src/app/api/ah/favorites/route.ts`

De AH API gebruikt OAuth2. Client credentials zijn publiek (in de app ingebakken).
Verifieer de exacte waarden in [agentcooper/albert-heijn](https://github.com/agentcooper/albert-heijn) als de tokens hieronder niet werken.

- [ ] **Stap 1: Maak het bestand aan**

```typescript
// photo-swipe-patch/src/app/api/ah/favorites/route.ts
import { NextResponse } from 'next/server'

const AH_AUTH_URL = 'https://api.ah.nl/mobile-auth/v1/auth/token'
const AH_API_URL = 'https://api.ah.nl'
const AH_CLIENT_ID = 'appie-android'
const AH_CLIENT_SECRET = 'vHue55rose6Mu9CH'

let cachedToken: { access_token: string; expires_at: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token
  }

  const username = process.env.AH_USERNAME!
  const password = process.env.AH_PASSWORD!

  const res = await fetch(AH_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username,
      password,
      client_id: AH_CLIENT_ID,
      client_secret: AH_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AH login mislukt (${res.status}): ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.access_token
}

let favoritesCache: { data: any; expires_at: number } | null = null

export async function GET() {
  try {
    if (favoritesCache && Date.now() < favoritesCache.expires_at) {
      return NextResponse.json(favoritesCache.data)
    }

    const token = await getToken()

    const res = await fetch(`${AH_API_URL}/mobile-services/v1/recipes/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return NextResponse.json({ favorites: [], error: `AH API ${res.status}` }, { status: 200 })
    }

    const raw = await res.json()

    // Normaliseer naar { id, title, duration, servings }
    const favorites = (raw.items ?? raw.recipes ?? raw ?? []).map((r: any) => ({
      id: String(r.id ?? r.recipeId ?? ''),
      title: r.title ?? r.name ?? 'Onbekend recept',
      duration: r.cookTime ?? r.preparationTime ?? r.totalTime ?? 0,
      servings: r.servings ?? r.portions ?? 4,
    })).filter((r: any) => r.id)

    const result = { favorites }
    favoritesCache = { data: result, expires_at: Date.now() + 6 * 60 * 60 * 1000 }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ favorites: [], error: e.message }, { status: 200 })
  }
}
```

- [ ] **Stap 2: Test handmatig via curl (na deploy)**

```bash
curl http://192.168.1.237:3001/api/ah/favorites
# Verwacht: { "favorites": [ { "id": "...", "title": "...", "duration": 25, "servings": 4 }, ... ] }
```

Als de response `{ "favorites": [], "error": "AH login mislukt" }` geeft:
- Controleer `AH_USERNAME` en `AH_PASSWORD` in de server `.env.local`
- Verifieer `AH_CLIENT_SECRET` via [agentcooper/albert-heijn](https://github.com/agentcooper/albert-heijn) of [jabbink gist](https://gist.github.com/jabbink/8bfa44bdfc535d696b340c46d228fdd1)
- Probeer `client_id: 'appie'` als `appie-android` niet werkt

- [ ] **Stap 3: Commit**

```bash
git add photo-swipe-patch/src/app/api/ah/favorites/route.ts
git commit -m "feat: AH favorites API route"
```

---

## Task 2: Recipe image renderer

**Files:**
- Create: `photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts`

Rendert een 1024×600 PNG met twee kolommen: ingrediënten links, actieve bereidingsstap rechts.

- [ ] **Stap 1: Installeer satori en resvg op de server**

```bash
ssh root@192.168.1.237 "cd /opt/photo-swipe && npm install satori @resvg-js/resvg-js"
```

- [ ] **Stap 2: Maak de route aan**

```typescript
// photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import satori from 'satori'
import { Resvg } from '@resvg-js/resvg-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const AH_AUTH_URL = 'https://api.ah.nl/mobile-auth/v1/auth/token'
const AH_API_URL = 'https://api.ah.nl'
const AH_CLIENT_ID = 'appie-android'
const AH_CLIENT_SECRET = 'vHue55rose6Mu9CH'

let cachedToken: { access_token: string; expires_at: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) return cachedToken.access_token
  const res = await fetch(AH_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: process.env.AH_USERNAME!,
      password: process.env.AH_PASSWORD!,
      client_id: AH_CLIENT_ID,
      client_secret: AH_CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error(`AH login mislukt (${res.status})`)
  const data = await res.json()
  cachedToken = { access_token: data.access_token, expires_at: Date.now() + (data.expires_in - 60) * 1000 }
  return cachedToken.access_token
}

async function fetchRecipe(id: string) {
  const token = await getToken()
  const res = await fetch(`${AH_API_URL}/mobile-services/v1/recipes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Recept niet gevonden (${res.status})`)
  return res.json()
}

function normalizeRecipe(raw: any) {
  const ingredients: string[] = (raw.ingredients ?? []).map(
    (i: any) => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name ?? i.description ?? ''}`.trim().replace(/\s+/g, ' ')
  )
  const steps: string[] = (raw.preparationSteps ?? raw.steps ?? raw.instructions ?? []).map(
    (s: any) => (typeof s === 'string' ? s : s.description ?? s.text ?? s.step ?? '')
  ).filter(Boolean)
  return {
    title: raw.title ?? raw.name ?? 'Recept',
    duration: raw.cookTime ?? raw.totalTime ?? 0,
    servings: raw.servings ?? raw.portions ?? 4,
    ingredients,
    steps,
  }
}

// Laad Roboto font (aanwezig in Next.js project, anders pas pad aan)
let fontData: Buffer | null = null
function getFont(): Buffer {
  if (fontData) return fontData
  // Probeer eerst het font uit het project, anders system font
  const candidates = [
    join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'),
    '/usr/share/fonts/truetype/roboto/Roboto-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ]
  for (const p of candidates) {
    try { fontData = readFileSync(p); return fontData } catch {}
  }
  throw new Error('Geen font gevonden. Kopieer Roboto-Regular.ttf naar /opt/photo-swipe/public/fonts/')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const stepParam = request.nextUrl.searchParams.get('step') ?? '0'
  const step = parseInt(stepParam, 10)

  try {
    const raw = await fetchRecipe(params.id)
    const recipe = normalizeRecipe(raw)
    const totalSteps = recipe.steps.length
    const currentStep = Math.max(0, Math.min(step, totalSteps - 1))
    const stepText = recipe.steps[currentStep] ?? 'Geen stappen gevonden.'

    const WIDTH = 1024
    const HEIGHT = 600
    const ACCENT = '#00D4FF'
    const BG = '#0D0D1A'
    const BG2 = '#1A1A2E'
    const TEXT = '#E0E0E0'
    const MUTED = '#888888'
    const DIVIDER = '#222233'

    const element = {
      type: 'div',
      props: {
        style: {
          width: WIDTH, height: HEIGHT,
          background: BG, display: 'flex', flexDirection: 'column',
          fontFamily: 'Roboto', color: TEXT,
        },
        children: [
          // Header
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 24px', borderBottom: `1px solid ${DIVIDER}`,
                background: '#111120',
              },
              children: [
                { type: 'span', props: { style: { fontSize: 22, fontWeight: 700, color: ACCENT }, children: recipe.title } },
                { type: 'span', props: { style: { fontSize: 14, color: MUTED }, children: `⏱ ${recipe.duration} min · 👥 ${recipe.servings} pers` } },
              ],
            },
          },
          // Body: split kolommen
          {
            type: 'div',
            props: {
              style: { display: 'flex', flex: 1 },
              children: [
                // Ingrediënten (links, 1/3)
                {
                  type: 'div',
                  props: {
                    style: {
                      width: 320, padding: '16px 20px',
                      borderRight: `1px solid ${DIVIDER}`,
                      display: 'flex', flexDirection: 'column',
                    },
                    children: [
                      { type: 'span', props: { style: { fontSize: 11, color: MUTED, letterSpacing: 2, marginBottom: 12 }, children: 'INGREDIËNTEN' } },
                      ...recipe.ingredients.slice(0, 14).map((ing) => ({
                        type: 'div',
                        props: {
                          style: { display: 'flex', alignItems: 'flex-start', marginBottom: 7 },
                          children: [
                            { type: 'span', props: { style: { color: ACCENT, marginRight: 8, fontSize: 12 }, children: '•' } },
                            { type: 'span', props: { style: { fontSize: 13, color: TEXT, lineHeight: 1.4 }, children: ing } },
                          ],
                        },
                      })),
                    ],
                  },
                },
                // Bereiding (rechts, 2/3)
                {
                  type: 'div',
                  props: {
                    style: { flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column' },
                    children: [
                      { type: 'span', props: { style: { fontSize: 11, color: MUTED, letterSpacing: 2, marginBottom: 12 }, children: 'BEREIDING' } },
                      // Huidige stap
                      {
                        type: 'div',
                        props: {
                          style: {
                            background: '#00D4FF12', borderLeft: `3px solid ${ACCENT}`,
                            padding: '14px 18px', borderRadius: '0 6px 6px 0', flex: 1,
                          },
                          children: [
                            { type: 'span', props: { style: { fontSize: 11, color: ACCENT, display: 'block', marginBottom: 10 }, children: `STAP ${currentStep + 1} / ${totalSteps}` } },
                            { type: 'span', props: { style: { fontSize: 16, lineHeight: 1.6, color: TEXT }, children: stepText } },
                          ],
                        },
                      },
                      // Stap dots
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 },
                          children: recipe.steps.slice(0, 12).map((_, i) => ({
                            type: 'div',
                            props: {
                              style: {
                                width: 8, height: 8, borderRadius: 4,
                                background: i === currentStep ? ACCENT : BG2,
                              },
                            },
                          })),
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    }

    const font = getFont()
    const svg = await satori(element as any, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Roboto', data: font, weight: 400, style: 'normal' }],
    })

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
    const png = resvg.render().asPng()

    return new NextResponse(png, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
        'X-Total-Steps': String(totalSteps),
      },
    })
  } catch (e: any) {
    // Fout-PNG: effen donker scherm met foutmelding
    const errorSvg = `<svg width="1024" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="600" fill="#0D0D1A"/>
      <text x="512" y="300" font-family="sans-serif" font-size="20" fill="#FF4466" text-anchor="middle">Recept laden mislukt: ${e.message}</text>
    </svg>`
    const resvg = new Resvg(errorSvg)
    const png = resvg.render().asPng()
    return new NextResponse(png, { headers: { 'Content-Type': 'image/png' } })
  }
}
```

- [ ] **Stap 3: Zorg voor een Roboto font op de server**

```bash
ssh root@192.168.1.237 "mkdir -p /opt/photo-swipe/public/fonts && \
  curl -L 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf' \
  -o /opt/photo-swipe/public/fonts/Roboto-Regular.ttf"
```

- [ ] **Stap 4: Test handmatig via curl (na deploy)**

```bash
curl "http://192.168.1.237:3001/api/ah/recipe/12345/image?step=0" --output /tmp/test-recept.jpg
open /tmp/test-recept.jpg
# Verwacht: 1024×600 donker PNG met ingrediënten links en stap 1 rechts
# Vervang 12345 door een recept-ID uit de favorites response
```

- [ ] **Stap 5: Commit**

```bash
git add photo-swipe-patch/src/app/api/ah/recipe/
git commit -m "feat: AH recipe image renderer met satori"
```

---

## Task 3: ESPHome — globals, text_sensor en artwork_image

**Files:**
- Modify: `esphome/ha-display-7.yaml` (globals sectie bij regel 12, text_sensor sectie, artwork_image sectie bij regel 699)

- [ ] **Stap 1: Voeg globals toe** (na regel 63, vóór de `external_components:` regel)

```yaml
  - id: ah_current_recipe_id
    type: std::string
    initial_value: '""'
  - id: ah_current_step
    type: int
    initial_value: '0'
  - id: ah_total_steps
    type: int
    initial_value: '1'
  - id: ah_recipe_page_active
    type: bool
    initial_value: 'false'
```

- [ ] **Stap 2: Voeg text_sensor toe** (na de bestaande `ha_review_status` text_sensor, rond regel 590)

```yaml
  - platform: homeassistant
    id: ha_ah_favorites
    entity_id: sensor.ah_favorites
    attribute: favorites_json
    internal: true
```

- [ ] **Stap 3: Voeg artwork_image toe** (na `radar_art`, in de `artwork_image:` sectie)

```yaml
  - id: recipe_art
    url: "http://192.168.1.237:3001/api/ah/recipe/placeholder/image?step=0"
    format: AUTO
    type: RGB565
    byte_order: LITTLE_ENDIAN
    resize: 1024x600
    resize_mode: STRETCH
    allow_insecure_local_urls: true
    update_interval: never
    on_download_finished:
      - lvgl.widget.show: img_recipe_detail
      - lvgl.widget.hide: lbl_recipe_loading
    on_error:
      - lvgl.widget.show: lbl_recipe_loading
      - logger.log: "Recipe art laad fout"
```

- [ ] **Stap 4: Compile-check (zonder flash)**

```bash
cp esphome/ha-display-7.yaml /tmp/ha_display_build/
cp esphome/secrets.yaml /tmp/ha_display_build/
cd /tmp/ha_display_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome compile ha-display-7.yaml
# Verwacht: Compiling... SUCCESS — geen errors
```

- [ ] **Stap 5: Commit**

```bash
git add esphome/ha-display-7.yaml
git commit -m "feat: ESPHome globals en artwork_image voor AH recepten"
```

---

## Task 4: ESPHome — nav rail knop

**Files:**
- Modify: `esphome/ha-display-7.yaml` (nav rail sectie, na regel 1305)

De nav rail heeft momenteel 6 knoppen. De laatste (Immich) eindigt op y:516 (y:452 + height:64). De versieregel staat op BOTTOM_MID y:-40. We verschuiven de versieregel naar y:-8 en voegen een recepten-knop toe.

- [ ] **Stap 1: Verschuif de versieregel**

Zoek (rond regel 1307):
```yaml
            - label:
                align: BOTTOM_MID
                y: -40
                text_font: font_roboto_16
                text_color: 0x666666
                text: "P4"
```

Vervang `y: -40` door `y: -8`.

- [ ] **Stap 2: Voeg de recepten nav-knop toe** (na de Immich knop, vóór de versieregel)

```yaml
            # Recepten — inactief
            - obj:
                x: 0
                y: 516
                width: 88
                height: 56
                bg_color: 0x050505
                bg_opa: COVER
                border_width: 0
                pad_all: 0
                widgets:
                  - obj:
                      id: nav_strip_recepten
                      x: 0
                      y: 4
                      width: 3
                      height: 48
                      bg_color: 0x050505
                      bg_opa: COVER
                      border_width: 0
                  - button:
                      id: nav_recepten
                      x: 16
                      y: 4
                      width: 56
                      height: 48
                      radius: 10
                      bg_color: 0x1a1a1a
                      bg_opa: COVER
                      on_click:
                        then:
                          - lvgl.page.show: page_recepten
                          - lambda: 'id(immich_page_active) = false; id(immich_overlay_countdown) = 0; id(ah_recipe_page_active) = false;'
                          - lvgl.widget.show: nav_rail_container
                          - lvgl.widget.show: top_status_bar
                          - lvgl.obj.update:
                              id: nav_strip_recepten
                              bg_color: 0xFF9020
                          - lvgl.obj.update:
                              id: nav_recepten
                              bg_color: 0x202020
                          - lvgl.obj.update:
                              id: nav_strip_energie
                              bg_color: 0x050505
                          - lvgl.obj.update:
                              id: nav_energie
                              bg_color: 0x1a1a1a
                          - lvgl.obj.update:
                              id: nav_strip_lichten
                              bg_color: 0x050505
                          - lvgl.obj.update:
                              id: nav_lichten
                              bg_color: 0x1a1a1a
                          - lvgl.obj.update:
                              id: nav_strip_media
                              bg_color: 0x050505
                          - lvgl.obj.update:
                              id: nav_media
                              bg_color: 0x1a1a1a
                          - lvgl.obj.update:
                              id: nav_strip_weather
                              bg_color: 0x050505
                          - lvgl.obj.update:
                              id: nav_weather
                              bg_color: 0x1a1a1a
                          - lvgl.obj.update:
                              id: nav_strip_agenda
                              bg_color: 0x050505
                          - lvgl.obj.update:
                              id: nav_agenda
                              bg_color: 0x1a1a1a
                          - lvgl.obj.update:
                              id: nav_strip_immich
                              bg_color: 0x050505
                          - lvgl.obj.update:
                              id: nav_immich
                              bg_color: 0x1a1a1a
                      widgets:
                        - label:
                            align: CENTER
                            text_font: font_roboto_16
                            text_color: 0xA0A0A0
                            text: "R"
```

Ook: voeg `nav_strip_recepten` reset toe aan álle andere nav-knoppen (energie, lichten, media, weather, agenda, immich). Zoek elke `on_click` sectie van een bestaande nav knop en voeg toe:
```yaml
                          - lvgl.obj.update:
                              id: nav_strip_recepten
                              bg_color: 0x050505
                          - lvgl.obj.update:
                              id: nav_recepten
                              bg_color: 0x1a1a1a
```

- [ ] **Stap 3: Compile-check**

```bash
cd /tmp/ha_display_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome compile ha-display-7.yaml
```

- [ ] **Stap 4: Commit**

```bash
git add esphome/ha-display-7.yaml
git commit -m "feat: ESPHome nav rail knop voor recepten scherm"
```

---

## Task 5: ESPHome — page_recepten (LVGL favorietenlijst)

**Files:**
- Modify: `esphome/ha-display-7.yaml` (pages sectie, na `page_doorbell`)

Het favorietenscherm toont maximaal 8 recepten als LVGL knoppen. De data komt als JSON string uit `ha_ah_favorites`. Omdat ESPHome geen JSON kan parsen, slaat de HA sensor de favorietenlijst op als 8 aparte template sensoren (zie Task 7).

- [ ] **Stap 1: Voeg de pagina toe** (na `page_doorbell`)

```yaml
    # ===========================================================
    # PAGINA 9: AH RECEPTEN
    # ===========================================================
    - id: page_recepten
      bg_color: 0x000000
      bg_opa: COVER
      scrollable: false
      widgets:
        # Favorietenlijst container (rechts van nav rail)
        - obj:
            x: 88
            y: 44
            width: 936
            height: 556
            bg_color: 0x000000
            bg_opa: COVER
            border_width: 0
            pad_all: 0
            scrollable: false
            widgets:
              - label:
                  x: 24
                  y: 12
                  text_font: font_roboto_16
                  text_color: 0x888888
                  text: "MIJN FAVORIETEN"
              # Recept 1
              - button:
                  id: btn_recept_1
                  x: 24
                  y: 44
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_1_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_1_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
              # Recept 2
              - button:
                  id: btn_recept_2
                  x: 24
                  y: 108
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_2_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_2_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
              # Recept 3
              - button:
                  id: btn_recept_3
                  x: 24
                  y: 172
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_3_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_3_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
              # Recept 4
              - button:
                  id: btn_recept_4
                  x: 24
                  y: 236
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_4_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_4_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
              # Recept 5
              - button:
                  id: btn_recept_5
                  x: 24
                  y: 300
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_5_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_5_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
              # Recept 6
              - button:
                  id: btn_recept_6
                  x: 24
                  y: 364
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_6_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_6_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
              # Recept 7
              - button:
                  id: btn_recept_7
                  x: 24
                  y: 428
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_7_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_7_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
              # Recept 8
              - button:
                  id: btn_recept_8
                  x: 24
                  y: 492
                  width: 888
                  height: 56
                  radius: 8
                  bg_color: 0x1A1A2E
                  bg_opa: COVER
                  border_width: 1
                  border_color: 0x222233
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0;'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - component.update: recipe_art
                  widgets:
                    - label:
                        id: lbl_recept_8_title
                        align: LEFT_MID
                        x: 16
                        text_font: font_roboto_16
                        text_color: 0xE0E0E0
                        text: "—"
                    - label:
                        id: lbl_recept_8_meta
                        align: RIGHT_MID
                        x: -16
                        text_font: font_roboto_16
                        text_color: 0x888888
                        text: ""
```

**Belangrijk:** elke `btn_recept_N` `on_click` moet het recept-ID instellen via een `lambda`. Zie Task 7 voor hoe de text_sensors het ID doorgeven via `ah_current_recipe_id`. De `component.update: recipe_art` triggert dan de download van de URL die opgebouwd wordt in Task 6.

- [ ] **Stap 2: Compile-check**

```bash
cd /tmp/ha_display_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome compile ha-display-7.yaml
```

- [ ] **Stap 3: Commit**

```bash
git add esphome/ha-display-7.yaml
git commit -m "feat: ESPHome page_recepten favorietenlijst"
```

---

## Task 6: ESPHome — page_recipe_detail + URL-logica

**Files:**
- Modify: `esphome/ha-display-7.yaml`

De `artwork_image` URL is statisch in de YAML — we gebruiken een script om de URL dynamisch te zetten via `artwork_image.set_url`.

- [ ] **Stap 1: Verander de recipe_art URL-opbouw**

De `artwork_image` component heeft een vaste URL in YAML, maar de URL kan dynamisch gezet worden via `artwork_image.set_url`. Voeg een script toe (in de `script:` sectie):

```yaml
  - id: recipe_load_current
    then:
      - artwork_image.set_url:
          id: recipe_art
          url: !lambda |
            std::string url = "http://192.168.1.237:3001/api/ah/recipe/";
            url += id(ah_current_recipe_id);
            url += "/image?step=";
            url += std::to_string(id(ah_current_step));
            return url;
      - component.update: recipe_art
```

- [ ] **Stap 2: Voeg page_recipe_detail toe** (na page_recepten)

```yaml
    # ===========================================================
    # PAGINA 10: RECEPT DETAIL
    # ===========================================================
    - id: page_recipe_detail
      bg_color: 0x000000
      bg_opa: COVER
      scrollable: false
      widgets:
        # Volledig scherm image (1024×600 PNG)
        - image:
            id: img_recipe_detail
            x: 0
            y: 0
            width: 1024
            height: 600
            src: recipe_art
            hidden: true
        # Loading label (zichtbaar tijdens download)
        - label:
            id: lbl_recipe_loading
            align: CENTER
            text_font: font_roboto_16
            text_color: 0x888888
            text: "Recept laden..."
        # Vorige stap knop
        - button:
            id: btn_recipe_prev
            x: 100
            y: 540
            width: 120
            height: 44
            radius: 8
            bg_color: 0x1A1A2E
            bg_opa: COVER
            border_width: 1
            border_color: 0x333344
            on_click:
              then:
                - lambda: >
                    if (id(ah_current_step) > 0) {
                      id(ah_current_step) -= 1;
                    }
                - lvgl.widget.hide: img_recipe_detail
                - lvgl.widget.show: lbl_recipe_loading
                - script.execute: recipe_load_current
            widgets:
              - label:
                  align: CENTER
                  text_font: font_roboto_16
                  text_color: 0xA0A0A0
                  text: "← vorige"
        # Volgende stap knop
        - button:
            id: btn_recipe_next
            x: 804
            y: 540
            width: 120
            height: 44
            radius: 8
            bg_color: 0x00D4FF22
            bg_opa: COVER
            border_width: 1
            border_color: 0x00D4FF55
            on_click:
              then:
                - lambda: >
                    if (id(ah_current_step) < id(ah_total_steps) - 1) {
                      id(ah_current_step) += 1;
                    }
                - lvgl.widget.hide: img_recipe_detail
                - lvgl.widget.show: lbl_recipe_loading
                - script.execute: recipe_load_current
            widgets:
              - label:
                  align: CENTER
                  text_font: font_roboto_16
                  text_color: 0x00D4FF
                  text: "volgende →"
        # Terug knop
        - button:
            id: btn_recipe_back
            x: 420
            y: 540
            width: 184
            height: 44
            radius: 8
            bg_color: 0x111120
            bg_opa: COVER
            border_width: 1
            border_color: 0x333344
            on_click:
              then:
                - lvgl.page.show: page_recepten
                - lvgl.obj.update:
                    id: nav_strip_recepten
                    bg_color: 0xFF9020
                - lvgl.obj.update:
                    id: nav_recepten
                    bg_color: 0x202020
            widgets:
              - label:
                  align: CENTER
                  text_font: font_roboto_16
                  text_color: 0x666677
                  text: "↩ terug naar lijst"
```

- [ ] **Stap 3: Update elke `btn_recept_N` on_click** (in page_recepten)

Elke receptknop moet het recept-ID zetten voordat de PNG geladen wordt. Voeg een lambda toe vóór de `component.update: recipe_art` in elk `on_click`. Voorbeeld voor recept 1 (herhaal voor 2-8):

```yaml
                  on_click:
                    then:
                      - lambda: 'id(ah_current_step) = 0; id(ah_current_recipe_id) = id(ha_recept_1_id).state.c_str();'
                      - lvgl.widget.hide: img_recipe_detail
                      - lvgl.widget.show: lbl_recipe_loading
                      - lvgl.page.show: page_recipe_detail
                      - script.execute: recipe_load_current
```

(Vervang `ha_recept_1_id` t/m `ha_recept_8_id` — zie Task 7.)

- [ ] **Stap 4: Update recipe_art on_download_finished om ah_total_steps te zetten**

Voeg toe aan `on_download_finished` van `recipe_art`:
```yaml
    on_download_finished:
      - lvgl.widget.show: img_recipe_detail
      - lvgl.image.update:
          id: img_recipe_detail
          src: recipe_art
      - lvgl.widget.hide: lbl_recipe_loading
```

(De `X-Total-Steps` header kan ESPHome niet uitlezen — de totaalstappen worden meegestuurd via een aparte HA sensor in Task 7, of we laten de knoppen altijd actief en de lambda checkt of step < huidige stap + iets. Simpelste oplossing: maak `ah_total_steps` een hoog getal als default, of stuur totaal mee in een aparte sensor.)

- [ ] **Stap 5: Compile-check**

```bash
cd /tmp/ha_display_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome compile ha-display-7.yaml
```

- [ ] **Stap 6: Commit**

```bash
git add esphome/ha-display-7.yaml
git commit -m "feat: ESPHome page_recipe_detail met navigatie knoppen"
```

---

## Task 7: HA REST sensor + template sensoren

**Files:**
- Modify: `home-assistant/ha-display-7-package.yaml`

ESPHome kan geen JSON parsen, dus we splitsen de favorietenlijst in HA op in 8 losse template sensoren (één per recept: ID, titel, duur).

- [ ] **Stap 1: Voeg REST sensor en template sensoren toe** aan het package bestand

```yaml
# AH Recepten
rest:
  - resource: "http://192.168.1.237:3001/api/ah/favorites"
    scan_interval: 21600
    sensor:
      - name: "ah_favorites_raw"
        value_template: "{{ value_json.favorites | length }} recepten"
        json_attributes:
          - favorites

template:
  - sensor:
      - name: "ah_recept_1_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[0].id | default('') }}"
      - name: "ah_recept_1_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[0].title | default('') }}"
      - name: "ah_recept_1_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[0].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[0].servings | default(0) }} p"
      - name: "ah_recept_2_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[1].id | default('') }}"
      - name: "ah_recept_2_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[1].title | default('') }}"
      - name: "ah_recept_2_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[1].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[1].servings | default(0) }} p"
      - name: "ah_recept_3_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[2].id | default('') }}"
      - name: "ah_recept_3_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[2].title | default('') }}"
      - name: "ah_recept_3_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[2].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[2].servings | default(0) }} p"
      - name: "ah_recept_4_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[3].id | default('') }}"
      - name: "ah_recept_4_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[3].title | default('') }}"
      - name: "ah_recept_4_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[3].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[3].servings | default(0) }} p"
      - name: "ah_recept_5_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[4].id | default('') }}"
      - name: "ah_recept_5_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[4].title | default('') }}"
      - name: "ah_recept_5_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[4].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[4].servings | default(0) }} p"
      - name: "ah_recept_6_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[5].id | default('') }}"
      - name: "ah_recept_6_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[5].title | default('') }}"
      - name: "ah_recept_6_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[5].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[5].servings | default(0) }} p"
      - name: "ah_recept_7_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[6].id | default('') }}"
      - name: "ah_recept_7_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[6].title | default('') }}"
      - name: "ah_recept_7_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[6].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[6].servings | default(0) }} p"
      - name: "ah_recept_8_id"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[7].id | default('') }}"
      - name: "ah_recept_8_title"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[7].title | default('') }}"
      - name: "ah_recept_8_meta"
        state: "{{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[7].duration | default(0) }} min · {{ (state_attr('sensor.ah_favorites_raw', 'favorites') or [])[7].servings | default(0) }} p"
```

- [ ] **Stap 2: Voeg text_sensors toe aan ESPHome** (in `text_sensor:` sectie van `ha-display-7.yaml`)

```yaml
  # AH Recepten favorieten (titel + meta + ID per slot)
  - platform: homeassistant
    id: ha_recept_1_title
    entity_id: sensor.ah_recept_1_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_1_title
          text: !lambda 'return id(ha_recept_1_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_1_id
    entity_id: sensor.ah_recept_1_id
    internal: true
  - platform: homeassistant
    id: ha_recept_1_meta
    entity_id: sensor.ah_recept_1_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_1_meta
          text: !lambda 'return id(ha_recept_1_meta).state.c_str();'
  # Herhaal voor recept 2 t/m 8 (zelfde patroon, verhoog nummers)
  - platform: homeassistant
    id: ha_recept_2_title
    entity_id: sensor.ah_recept_2_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_2_title
          text: !lambda 'return id(ha_recept_2_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_2_id
    entity_id: sensor.ah_recept_2_id
    internal: true
  - platform: homeassistant
    id: ha_recept_2_meta
    entity_id: sensor.ah_recept_2_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_2_meta
          text: !lambda 'return id(ha_recept_2_meta).state.c_str();'
  - platform: homeassistant
    id: ha_recept_3_title
    entity_id: sensor.ah_recept_3_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_3_title
          text: !lambda 'return id(ha_recept_3_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_3_id
    entity_id: sensor.ah_recept_3_id
    internal: true
  - platform: homeassistant
    id: ha_recept_3_meta
    entity_id: sensor.ah_recept_3_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_3_meta
          text: !lambda 'return id(ha_recept_3_meta).state.c_str();'
  - platform: homeassistant
    id: ha_recept_4_title
    entity_id: sensor.ah_recept_4_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_4_title
          text: !lambda 'return id(ha_recept_4_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_4_id
    entity_id: sensor.ah_recept_4_id
    internal: true
  - platform: homeassistant
    id: ha_recept_4_meta
    entity_id: sensor.ah_recept_4_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_4_meta
          text: !lambda 'return id(ha_recept_4_meta).state.c_str();'
  - platform: homeassistant
    id: ha_recept_5_title
    entity_id: sensor.ah_recept_5_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_5_title
          text: !lambda 'return id(ha_recept_5_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_5_id
    entity_id: sensor.ah_recept_5_id
    internal: true
  - platform: homeassistant
    id: ha_recept_5_meta
    entity_id: sensor.ah_recept_5_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_5_meta
          text: !lambda 'return id(ha_recept_5_meta).state.c_str();'
  - platform: homeassistant
    id: ha_recept_6_title
    entity_id: sensor.ah_recept_6_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_6_title
          text: !lambda 'return id(ha_recept_6_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_6_id
    entity_id: sensor.ah_recept_6_id
    internal: true
  - platform: homeassistant
    id: ha_recept_6_meta
    entity_id: sensor.ah_recept_6_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_6_meta
          text: !lambda 'return id(ha_recept_6_meta).state.c_str();'
  - platform: homeassistant
    id: ha_recept_7_title
    entity_id: sensor.ah_recept_7_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_7_title
          text: !lambda 'return id(ha_recept_7_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_7_id
    entity_id: sensor.ah_recept_7_id
    internal: true
  - platform: homeassistant
    id: ha_recept_7_meta
    entity_id: sensor.ah_recept_7_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_7_meta
          text: !lambda 'return id(ha_recept_7_meta).state.c_str();'
  - platform: homeassistant
    id: ha_recept_8_title
    entity_id: sensor.ah_recept_8_title
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_8_title
          text: !lambda 'return id(ha_recept_8_title).state.c_str();'
  - platform: homeassistant
    id: ha_recept_8_id
    entity_id: sensor.ah_recept_8_id
    internal: true
  - platform: homeassistant
    id: ha_recept_8_meta
    entity_id: sensor.ah_recept_8_meta
    internal: true
    on_value:
      - lvgl.label.update:
          id: lbl_recept_8_meta
          text: !lambda 'return id(ha_recept_8_meta).state.c_str();'
```

- [ ] **Stap 3: Compile-check**

```bash
cd /tmp/ha_display_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome compile ha-display-7.yaml
```

- [ ] **Stap 4: Commit**

```bash
git add home-assistant/ha-display-7-package.yaml esphome/ha-display-7.yaml
git commit -m "feat: HA template sensoren en ESPHome text_sensors voor AH recepten"
```

---

## Task 8: Deploy + env vars instellen

**Files:**
- Modify: `deploy-to-ha.sh`

- [ ] **Stap 1: Voeg AH routes toe aan deploy script**

Zoek in `deploy-to-ha.sh` de sectie `# ── Photo-swipe route ──` en voeg toe (na de bestaande `scp` regels):

```bash
# AH Recepten routes
ssh "${SWIPE_USER}@${SWIPE_HOST}" "mkdir -p /opt/photo-swipe/src/app/api/ah/favorites /opt/photo-swipe/src/app/api/ah/recipe/\[id\]/image"

scp "${REPO_DIR}/photo-swipe-patch/src/app/api/ah/favorites/route.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/app/api/ah/favorites/route.ts"

scp "${REPO_DIR}/photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/app/api/ah/recipe/[id]/image/route.ts"
```

- [ ] **Stap 2: Voeg AH credentials toe aan .env.local op de server**

```bash
ssh root@192.168.1.237 "echo 'AH_USERNAME=jouw@email.nl' >> /opt/photo-swipe/.env.local"
ssh root@192.168.1.237 "echo 'AH_PASSWORD=jouwwachtwoord' >> /opt/photo-swipe/.env.local"
```

- [ ] **Stap 3: Deploy alles**

```bash
./deploy-to-ha.sh
```

- [ ] **Stap 4: Controleer of de server herstart is**

```bash
ssh root@192.168.1.237 "pm2 status"
# Verwacht: photo-swipe status: online
```

- [ ] **Stap 5: Test favorites endpoint**

```bash
curl http://192.168.1.237:3001/api/ah/favorites
# Verwacht: { "favorites": [ { "id": "...", "title": "...", ... } ] }
```

- [ ] **Stap 6: Test recipe image endpoint**

```bash
# Gebruik een ID uit de favorites response
RECEPT_ID="12345"
curl "http://192.168.1.237:3001/api/ah/recipe/${RECEPT_ID}/image?step=0" --output /tmp/recept-test.jpg
open /tmp/recept-test.jpg
```

- [ ] **Stap 7: Deploy HA package en herlaad HA**

```bash
./deploy-to-ha.sh
# Daarna in HA: Developer Tools → YAML → Reload All
```

- [ ] **Stap 8: Controleer HA sensoren**

In HA Developer Tools → States, zoek naar `sensor.ah_recept_1_title`.
Verwacht: receptnaam van je eerste favoriet.

- [ ] **Stap 9: Commit**

```bash
git add deploy-to-ha.sh
git commit -m "feat: deploy script voor AH recepten routes"
```

---

## Task 9: Flash ESPHome + eindtest

- [ ] **Stap 1: Flash via OTA**

```bash
cp esphome/ha-display-7.yaml /tmp/ha_display_build/
cp esphome/secrets.yaml /tmp/ha_display_build/
cd /tmp/ha_display_build
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome run ha-display-7.yaml --device 192.168.1.186
```

Bij timeout → gebruik USB:
```bash
DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib esphome run ha-display-7.yaml --device /dev/cu.usbmodem21201
```

- [ ] **Stap 2: Eindtest op het display**

1. Tik op het 🍳 / "R" icoon in de nav rail
2. Verwacht: lijst met receptnamen en tijden verschijnt
3. Tik op een recept → "Recept laden..." zichtbaar, daarna split-scherm PNG
4. Tik "volgende →" → stap 2 PNG laadt
5. Tik "↩ terug naar lijst" → terug naar favorietenlijst
6. Controleer dat andere nav knoppen (energie, lichten etc.) nog werken

- [ ] **Stap 3: Final commit**

```bash
git add -A
git commit -m "feat: AH recepten scherm compleet"
```
