import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const photo = await prisma.photo.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
  const filepath = path.join(uploadDir, photo.path)
  const buffer = await readFile(filepath)
  return new NextResponse(buffer, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=31536000' } })
}
