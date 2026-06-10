import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import path from 'path'

// Serve the cached Google Places photo for a place. Place images are shared
// across users (they describe the venue, not anyone's visit), so any
// signed-in user may read them.
export async function GET(_req: Request, { params }: { params: { placeId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const place = await prisma.place.findUnique({
    where: { id: params.placeId },
    select: { imagePath: true },
  })
  if (!place?.imagePath) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
  try {
    const buffer = await readFile(path.join(uploadDir, place.imagePath))
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=31536000' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
