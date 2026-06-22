import { NextResponse } from 'next/server'

const AH_AUTH_URL = 'https://api.ah.nl/mobile-auth/v1/auth/token'
const AH_API_URL = 'https://api.ah.nl'
const AH_CLIENT_ID = process.env.AH_CLIENT_ID ?? 'appie-android'
const AH_CLIENT_SECRET = process.env.AH_CLIENT_SECRET ?? 'vHue55rose6Mu9CH'

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
    console.error('[ah/favorites] Error:', e.message)
    return NextResponse.json({ favorites: [], error: e.message }, { status: 200 })
  }
}
