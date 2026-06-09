import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Attach a tag (by name) to a place. The tag is created on the fly if new, so
// a single call covers both "pick existing" and "type a new one".
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const up = await prisma.userPlace.findFirst({ where: { id: params.id, userId } })
  if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name } = await req.json()
  const trimmed = (name ?? '').trim()
  if (!trimmed) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const tag = await prisma.tag.upsert({
    where: { name_userId: { name: trimmed, userId } },
    create: { name: trimmed, userId },
    update: {},
  })

  await prisma.userPlaceTag.upsert({
    where: { userPlaceId_tagId: { userPlaceId: up.id, tagId: tag.id } },
    create: { userPlaceId: up.id, tagId: tag.id },
    update: {},
  })

  return NextResponse.json(tag, { status: 201 })
}
