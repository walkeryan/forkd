import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { previewCachePath, fetchAndCachePhoto } from '@/lib/placeEnrichment'
import { readFile } from 'fs/promises'
import path from 'path'

// Thumbnail proxy for Add Place search results. Keeps the Places API key
// server-side and fetches each photo from Google at most once:
//   1. a place we already track with a saved image -> serve that
//   2. cached preview for this googlePlaceId -> serve it
//   3. otherwise fetch via the photo reference, cache, serve
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const googlePlaceId = searchParams.get('placeId')
  const photoReference = searchParams.get('ref')
  if (!googlePlaceId) return NextResponse.json({ error: 'placeId required' }, { status: 400 })

  const serve = async (relativePath: string) => {
    const buffer = await readFile(path.join(process.env.UPLOAD_DIR ?? './uploads', relativePath))
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=31536000' },
    })
  }

  // 1. Already-tracked place with a saved image.
  const known = await prisma.place.findUnique({
    where: { googlePlaceId },
    select: { imagePath: true },
  })
  if (known?.imagePath) {
    try {
      return await serve(known.imagePath)
    } catch {
      // Fall through to the preview cache / fetch.
    }
  }

  // 2. Cached preview.
  const preview = previewCachePath(googlePlaceId)
  try {
    return await serve(preview)
  } catch {
    // Not cached yet.
  }

  // 3. Fetch from Google once.
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!photoReference || !apiKey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const ok = await fetchAndCachePhoto(photoReference, apiKey, preview, 240)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return serve(preview)
}
