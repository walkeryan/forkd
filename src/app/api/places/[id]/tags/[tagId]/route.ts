import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Detach a tag from a place (leaves the tag itself intact).
export async function DELETE(_req: Request, { params }: { params: { id: string; tagId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const up = await prisma.userPlace.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.userPlaceTag.deleteMany({ where: { userPlaceId: up.id, tagId: params.tagId } })
  return NextResponse.json({ ok: true })
}
