// Server-side place enrichment + Google Places photo caching.
//
// Two caches live in the uploads volume:
//   place-previews/<googlePlaceId>.webp — small thumbnails for search results
//   place-images/<placeId>.webp         — the saved photo for tracked places
//
// Every Google photo is fetched at most once; search previews are reused when
// a place is later added, so the add flow usually costs zero photo requests.
import { prisma } from '@/lib/prisma'
import { copyFile, mkdir, access } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const DETAILS_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json'
const PHOTO_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/photo'

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? './uploads'
}

/** Google place ids are URL-safe, but never trust them as raw filenames. */
function safeName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '')
}

/** Relative cache path for a search-result preview thumbnail. */
export function previewCachePath(googlePlaceId: string): string {
  return path.join('place-previews', `${safeName(googlePlaceId)}.webp`)
}

async function fileExists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(uploadDir(), relativePath))
    return true
  } catch {
    return false
  }
}

/** Download a Places photo, convert to webp, store at the relative path. */
export async function fetchAndCachePhoto(
  photoReference: string,
  apiKey: string,
  relativePath: string,
  maxWidth: number,
): Promise<boolean> {
  try {
    const url = new URL(PHOTO_ENDPOINT)
    url.searchParams.set('maxwidth', String(maxWidth))
    url.searchParams.set('photo_reference', photoReference)
    url.searchParams.set('key', apiKey)

    // The photo endpoint 302s to the actual image; fetch follows it.
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())

    const absolute = path.join(uploadDir(), relativePath)
    await mkdir(path.dirname(absolute), { recursive: true })
    await sharp(buffer)
      .resize(maxWidth, maxWidth, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(absolute)
    return true
  } catch (err) {
    console.error('fetchAndCachePhoto failed:', err)
    return false
  }
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

    const updates: { website?: string; imagePath?: string } = {}
    const imageRelative = path.join('place-images', `${safeName(placeId)}.webp`)

    // A search preview cached for this google place doubles as the saved
    // image — avatars render at ≤64px, so the 240px preview is plenty.
    if (!place.imagePath) {
      const preview = previewCachePath(place.googlePlaceId)
      if (await fileExists(preview)) {
        const absolute = path.join(uploadDir(), imageRelative)
        await mkdir(path.dirname(absolute), { recursive: true })
        await copyFile(path.join(uploadDir(), preview), absolute)
        updates.imagePath = imageRelative
      }
    }

    if (!place.website || (!place.imagePath && !updates.imagePath)) {
      const url = new URL(DETAILS_ENDPOINT)
      url.searchParams.set('place_id', place.googlePlaceId)
      url.searchParams.set('fields', 'website,photos')
      url.searchParams.set('key', apiKey)

      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const result: { website?: string; photos?: { photo_reference: string }[] } = data.result ?? {}

        if (!place.website && result.website) {
          updates.website = result.website
        }
        if (!place.imagePath && !updates.imagePath && result.photos?.[0]?.photo_reference) {
          const ok = await fetchAndCachePhoto(result.photos[0].photo_reference, apiKey, imageRelative, 800)
          if (ok) updates.imagePath = imageRelative
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.place.update({ where: { id: placeId }, data: updates })
    }
  } catch (err) {
    console.error('enrichPlace failed:', err)
  }
}
