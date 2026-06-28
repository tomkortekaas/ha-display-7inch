// src/app/api/today/route.ts
//
// Geeft het aantal foto's van vandaag terug die nog NIET zijn beoordeeld.
// Gebruikt door HA REST sensor (sensor.immich_review_vandaag_count).
// Verwacht response: { "count": N }
//
import { NextResponse } from 'next/server'

const IMMICH_URL = () => process.env.IMMICH_URL!
const API_KEY = () => process.env.IMMICH_API_KEY!

export async function GET() {
  try {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10) // "YYYY-MM-DD"

    // Haal assets van vandaag op via Immich search
    const res = await fetch(`${IMMICH_URL()}/api/search/metadata`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        takenAfter: `${dateStr}T00:00:00.000Z`,
        takenBefore: `${dateStr}T23:59:59.999Z`,
        withExif: false,
        size: 1000,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ count: 0, error: 'immich_error' }, { status: 200 })
    }

    const data = await res.json()
    const assets: any[] = data.assets?.items ?? []

    // Filter: nog niet beoordeeld (geen tag "beoordeeld")
    const unreviewed = assets.filter((a: any) => {
      const tags: string[] = (a.tags ?? []).map((t: any) =>
        typeof t === 'string' ? t : t.name ?? ''
      )
      return !tags.includes('beoordeeld')
    })

    return NextResponse.json({ count: unreviewed.length, date: dateStr })
  } catch (e: any) {
    return NextResponse.json({ count: 0, error: e.message }, { status: 200 })
  }
}
