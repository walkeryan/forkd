import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File
  const userPlaceId = form.get('userPlaceId') as string | null
  const visitId = form.get('visitId') as string | null
  const mealId = form.get('mealId') as string | null

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
  const now = new Date()
  const folder = path.join(uploadDir, session.user.id, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'))
  await mkdir(folder, { recursive: true })

  const id = crypto.randomUUID()
  const filename = `${id}.webp`
  const filepath = path.join(folder, filename)
  const relativePath = path.join(session.user.id, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'), filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await sharp(buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(filepath)

  const photo = await prisma.photo.create({
    data: { userId: session.user.id, path: relativePath, userPlaceId: userPlaceId || null, visitId: visitId || null, mealId: mealId || null },
  })
  return NextResponse.json(photo, { status: 201 })
}
