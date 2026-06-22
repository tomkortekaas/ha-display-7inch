// photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import satori from 'satori'
import { Resvg } from '@resvg-js/resvg-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const AH_AUTH_URL = 'https://api.ah.nl/mobile-auth/v1/auth/token'
const AH_API_URL = 'https://api.ah.nl'
const AH_CLIENT_ID = process.env.AH_CLIENT_ID ?? 'appie-android'
const AH_CLIENT_SECRET = process.env.AH_CLIENT_SECRET!

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

// Module-level font cache — works in single-instance server; cold on every serverless cold start
let fontData: Buffer | null = null
function getFont(): Buffer {
  if (fontData) return fontData
  const candidates = [
    join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'),
    '/usr/share/fonts/truetype/roboto/Roboto-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ]
  for (const p of candidates) {
    try { fontData = readFileSync(p); return fontData } catch {}
  }
  throw new Error('Geen font gevonden. Kopieer Roboto-Regular.ttf naar public/fonts/')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const stepParam = request.nextUrl.searchParams.get('step') ?? '0'
  const step = Math.max(0, parseInt(stepParam, 10) || 0)

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
                // Ingrediënten (links, ~1/3)
                {
                  type: 'div',
                  props: {
                    style: {
                      width: 320, padding: '16px 20px',
                      borderRight: `1px solid ${DIVIDER}`,
                      display: 'flex', flexDirection: 'column',
                    },
                    children: [
                      { type: 'span', props: { style: { fontSize: 11, color: MUTED, letterSpacing: 2, marginBottom: 12 }, children: 'INGREDIENTEN' } },
                      ...recipe.ingredients.slice(0, 14).map((ing: string) => ({
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
                // Bereiding (rechts, ~2/3)
                {
                  type: 'div',
                  props: {
                    style: { flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column' },
                    children: [
                      { type: 'span', props: { style: { fontSize: 11, color: MUTED, letterSpacing: 2, marginBottom: 12 }, children: 'BEREIDING' } },
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
                          children: recipe.steps.slice(0, 12).map((_: string, i: number) => ({
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
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'X-Total-Steps': String(totalSteps),
      },
    })
  } catch (e: any) {
    console.error('[ah/recipe/image] Error:', e.message)
    // Fout-PNG: effen donker scherm met foutmelding
    const errorSvg = `<svg width="1024" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="600" fill="#0D0D1A"/>
      <text x="512" y="300" font-family="sans-serif" font-size="20" fill="#FF4466" text-anchor="middle">Recept laden mislukt</text>
    </svg>`
    try {
      const resvg = new Resvg(errorSvg)
      const png = resvg.render().asPng()
      return new NextResponse(png, { headers: { 'Content-Type': 'image/png' } })
    } catch {
      return new NextResponse('error', { status: 500 })
    }
  }
}
