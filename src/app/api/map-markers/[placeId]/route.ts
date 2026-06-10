import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

// Circular map-marker icons: the place photo (or brand favicon) masked into a
// circle with a white ring, so markers read as proper pins instead of raw
// squares. Generated once per place and cached in the uploads volume.

const SIZE = 96 // rendered at ~36 CSS px -> crisp on 2-3x displays
const RING = 8
const INNER = SIZE - RING * 2

const FALLBACK_FILL: Record<string, string> = {
  visited: '#f97316',
  wishlist: '#0d9488',
}

function circleSvg(d: number, fill: string): Buffer {
  return Buffer.from(`<svg width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="${fill}"/></svg>`)
}

async function buildMarker(src: Buffer | null, fallbackFill: string): Promise<Buffer> {
  const inner = src
    ? await sharp(src)
        .resize(INNER, INNER, { fit: 'cover' })
        .composite([{ input: circleSvg(INNER, '#fff'), blend: 'dest-in' }])
        .png()
        .toBuffer()
    : await sharp(circleSvg(INNER, fallbackFill)).png().toBuffer()

  return sharp(circleSvg(SIZE, '#ffffff'))
    .composite([{ input: inner, left: RING, top: RING }])
    .png()
    .toBuffer()
}

export async function GET(req: Request, { params }: { params: { placeId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('c') === 'wishlist' ? 'wishlist' : 'visited'

  const place = await prisma.place.findUnique({
    where: { id: params.placeId },
    select: { imagePath: true, website: true },
  })
  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
  const safeId = params.placeId.replace(/[^a-zA-Z0-9_-]/g, '')
  const cacheRelative = path.join('marker-icons', `${safeId}-${status}.png`)
  const cacheAbsolute = path.join(uploadDir, cacheRelative)

  const headers = { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400' }

  try {
    return new NextResponse(new Uint8Array(await readFile(cacheAbsolute)), { headers })
  } catch {
    // Not cached yet — build it below.
  }

  // Source image: cached place photo, else brand favicon fetched server-side.
  let src: Buffer | null = null
  if (place.imagePath) {
    try {
      src = await readFile(path.join(uploadDir, place.imagePath))
    } catch {
      src = null
    }
  }
  if (!src && place.website) {
    try {
      const domain = new URL(place.website.includes('://') ? place.website : `https://${place.website}`).hostname
      const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`, { cache: 'no-store' })
      if (res.ok) src = Buffer.from(await res.arrayBuffer())
    } catch {
      src = null
    }
  }

  try {
    const marker = await buildMarker(src, FALLBACK_FILL[status])
    await mkdir(path.dirname(cacheAbsolute), { recursive: true })
    await writeFile(cacheAbsolute, marker)
    return new NextResponse(new Uint8Array(marker), { headers })
  } catch (err) {
    console.error('map marker build failed:', err)
    return NextResponse.json({ error: 'Marker unavailable' }, { status: 500 })
  }
}
