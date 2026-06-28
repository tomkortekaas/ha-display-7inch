import { NextResponse } from 'next/server'

const IMMICH_URL = () => process.env.IMMICH_URL!
const API_KEY = () => process.env.IMMICH_API_KEY!
const TZ = process.env.TZ || 'Europe/Amsterdam'

function localDate() {
  const s = new Date().toLocaleDateString('sv-SE', { timeZone: TZ }) // "YYYY-MM-DD"
  const [y, m, d] = s.split('-').map(Number)
  return { year: y, month: m, day: d, dateStr: s }
}

async function immichFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${IMMICH_URL()}${path}`, {
    ...init,
    headers: { 'x-api-key': API_KEY(), 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    await res.body?.cancel().catch(() => {})
    throw new Error(`Immich ${path} → ${res.status}`)
  }
  return res
}

async function searchMetadata(body: Record<string, unknown>): Promise<string[]> {
  const ids: string[] = []
  let page = 1
  while (true) {
    const res = await immichFetch('/api/search/metadata', {
      method: 'POST',
      body: JSON.stringify({ ...body, page, size: 1000 }),
    })
    const data = await res.json()
    const items: any[] = data?.assets?.items ?? []
    ids.push(...items.map((a: any) => a.id as string))
    if (items.length < 1000) break
    page++
  }
  return ids
}

// Zelfde logica als sessions/route.ts type='thisday': zoek per jaar van 2000 t/m nu.
async function fetchThisDayIds(month: number, day: number, currentYear: number): Promise<string[]> {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  const all: string[] = []
  for (let y = 1972; y <= currentYear; y++) {
    const lastDay = new Date(y, month, 0).getDate()
    if (day > lastDay) continue
    const items = await searchMetadata({
      takenAfter: `${y}-${m}-${d}T00:00:00.000Z`,
      takenBefore: `${y}-${m}-${d}T23:59:59.999Z`,
    })
    all.push(...items)
  }
  return all
}

async function getReviewedIds(assetIds: string[]): Promise<Set<string>> {
  if (!assetIds.length) return new Set()
  const tagsRes = await immichFetch('/api/tags')
  const tags: any[] = await tagsRes.json()
  const btag = tags.find((t: any) => (t.value ?? t.name) === 'beoordeeld')
  if (!btag) return new Set()
  const reviewed = await searchMetadata({ tagIds: [btag.id] })
  const reviewedSet = new Set(reviewed)
  return new Set(assetIds.filter((id) => reviewedSet.has(id)))
}

async function fetchUnreviewed(): Promise<string[]> {
  const { month, day, year } = localDate()
  const all = await fetchThisDayIds(month, day, year)
  const reviewed = await getReviewedIds(all)
  return all.filter((id) => !reviewed.has(id))
}

// GET /api/display-session/today
// Gebruikt door HA REST sensor (sensor.immich_review_vandaag_count)
export async function GET() {
  try {
    const { dateStr } = localDate()
    const unreviewed = await fetchUnreviewed()
    return NextResponse.json({ count: unreviewed.length, date: dateStr })
  } catch (e: any) {
    return NextResponse.json({ count: 0, error: e.message }, { status: 200 })
  }
}

// POST /api/display-session/today
// Gebruikt door immich_rotate_7inch.py (fetch_today_queue)
export async function POST() {
  try {
    const { dateStr } = localDate()
    const unreviewed = await fetchUnreviewed()
    return NextResponse.json({ assetIds: unreviewed, count: unreviewed.length, date: dateStr })
  } catch (e: any) {
    return NextResponse.json({ assetIds: [], count: 0, error: e.message }, { status: 200 })
  }
}
