// Server-side place enrichment: fetch the website and one representative
// photo for a Google place, cache the photo to the uploads volume, and save
// both on the Place row. Runs best-effort at place-creation time — failures
// are logged and swallowed so they never block adding a place.
import { prisma } from '@/lib/prisma'
import { mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const DETAILS_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json'
const PHOTO_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/photo'

interface PlaceDetailsResult {
  website?: string
  photos?: { photo_reference: string }[]
}

/**
 * Populate `website` and `imagePath` for a Place that has a googlePlaceId.
 * Skips work already done, so it's safe to call on the dedupe path too
 * (re-adding an existing place backfills older rows).
 */
export async function enrichPlace(placeId: string): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return

  try {
    const place = await prisma.place.findUnique({ where: { id: placeId } })
    if (!place?.googlePlaceId) return
    if (place.website && place.imagePath) return

    const url = new URL(DETAILS_ENDPOINT)
    url.searchParams.set('place_id', place.googlePlaceId)
    url.searchParams.set('fields', 'website,photos')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const result: PlaceDetailsResult = data.result ?? {}

    const updates: { website?: string; imagePath?: string } = {}

    if (!place.website && result.website) {
      updates.website = result.website
    }

    if (!place.imagePath && result.photos?.[0]?.photo_reference) {
      const imagePath = await cachePlacePhoto(placeId, result.photos[0].photo_reference, apiKey)
      if (imagePath) updates.imagePath = imagePath
    }

    if (Object.keys(updates).length > 0) {
      await prisma.place.update({ where: { id: placeId }, data: updates })
    }
  } catch (err) {
    console.error('enrichPlace failed:', err)
  }
}

/** Download a Places photo and store it as webp; returns the relative path. */
async function cachePlacePhoto(placeId: string, photoReference: string, apiKey: string): Promise<string | null> {
  try {
    const url = new URL(PHOTO_ENDPOINT)
    url.searchParams.set('maxwidth', '800')
    url.searchParams.set('photo_reference', photoReference)
    url.searchParams.set('key', apiKey)

    // The photo endpoint 302s to the actual image; fetch follows it.
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())

    const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
    const folder = path.join(uploadDir, 'place-images')
    await mkdir(folder, { recursive: true })

    const relativePath = path.join('place-images', `${placeId}.webp`)
    await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(uploadDir, relativePath))

    return relativePath
  } catch (err) {
    console.error('cachePlacePhoto failed:', err)
    return null
  }
}
