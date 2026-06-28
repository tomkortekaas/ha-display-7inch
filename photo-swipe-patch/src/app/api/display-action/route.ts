// src/app/api/display-action/route.ts
//
// Standalone actie-endpoint voor het 7-inch ESPHome display.
// Geen sessie nodig — werkt direct op een Immich asset-ID.
//
import { NextRequest, NextResponse } from 'next/server'
import { trashAsset, restoreAsset } from '@/lib/immich'
import { incrementReviewed, decrementReviewed } from '@/lib/stats'

const IMMICH_URL = () => process.env.IMMICH_URL!
const API_KEY = () => process.env.IMMICH_API_KEY!

async function getOrCreateTag(name: string): Promise<string | null> {
  const res = await fetch(`${IMMICH_URL()}/api/tags`, {
    headers: { 'x-api-key': API_KEY() },
  })
  if (!res.ok) return null
  const tags: any[] = await res.json()
  const existing = tags.find((t: any) => t.name === name)
  if (existing) return existing.id
  const createRes = await fetch(`${IMMICH_URL()}/api/tags`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!createRes.ok) return null
  const created = await createRes.json()
  return created.id ?? null
}

async function addTags(assetId: string, tagNames: string[]) {
  const ids = (await Promise.all(tagNames.map(getOrCreateTag))).filter(Boolean) as string[]
  if (!ids.length) return
  await fetch(`${IMMICH_URL()}/api/tags/assets`, {
    method: 'PUT',
    headers: { 'x-api-key': API_KEY(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetIds: [assetId], tagIds: ids }),
  })
}

async function removeTag(assetId: string, tagName: string) {
  const res = await fetch(`${IMMICH_URL()}/api/tags`, {
    headers: { 'x-api-key': API_KEY() },
  })
  if (!res.ok) return
  const tags: any[] = await res.json()
  const tag = tags.find((t: any) => t.name === tagName)
  if (!tag) return
  await fetch(`${IMMICH_URL()}/api/tags/${tag.id}/assets`, {
    method: 'DELETE',
    headers: { 'x-api-key': API_KEY(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetIds: [assetId] }),
  })
}

async function getAssetDate(assetId: string): Promise<string> {
  try {
    const res = await fetch(`${IMMICH_URL()}/api/assets/${assetId}`, {
      headers: { 'x-api-key': API_KEY() },
    })
    if (res.ok) {
      const a = await res.json()
      return a.exifInfo?.dateTimeOriginal ?? a.fileCreatedAt ?? ''
    }
  } catch {}
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { assetId, action, lastAssetId } = body as {
      assetId: string
      action: 'keep' | 'skip' | 'trash' | 'undo' | 'rotate'
      lastAssetId?: string
    }

    if (!assetId || !action) {
      return NextResponse.json({ error: 'assetId en action zijn verplicht' }, { status: 400 })
    }

    if (action === 'keep') {
      await addTags(assetId, ['beoordeeld'])
      const date = await getAssetDate(assetId)
      if (date) incrementReviewed(date, [])

    } else if (action === 'skip') {
      await addTags(assetId, ['beoordeeld', 'twijfel'])
      const date = await getAssetDate(assetId)
      if (date) incrementReviewed(date, [])

    } else if (action === 'trash') {
      await trashAsset(assetId)
      await addTags(assetId, ['beoordeeld'])
      const date = await getAssetDate(assetId)
      if (date) incrementReviewed(date, [])

    } else if (action === 'undo') {
      const targetId = lastAssetId ?? assetId
      await restoreAsset(targetId)
      await removeTag(targetId, 'beoordeeld')
      const date = await getAssetDate(targetId)
      if (date) decrementReviewed(date, [])

    } else if (action === 'rotate') {
      // Rotatie wordt afgehandeld door het Python-script dat direct Immich aanroept.
      // Deze route bevestigt alleen de ontvangst.

    } else {
      return NextResponse.json({ error: `Onbekende actie: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, action, assetId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
