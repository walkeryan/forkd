import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Confirm the special belongs to a place the current user tracks, and return
// the resolved placeId so callers can scope their mutation.
async function ownedSpecial(userPlaceId: string, specialId: string, userId: string) {
  const up = await prisma.userPlace.findFirst({ where: { id: userPlaceId, userId }, select: { placeId: true } })
  if (!up) return null
  const special = await prisma.placeSpecial.findFirst({ where: { id: specialId, placeId: up.placeId } })
  return special
}

export async function PATCH(req: Request, { params }: { params: { id: string; specialId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const special = await ownedSpecial(params.id, params.specialId, session.user.id)
  if (!special) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.placeSpecial.update({
    where: { id: params.specialId },
    data: {
      ...(body.type !== undefined && { type: body.type }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek }),
      ...(body.startTime !== undefined && { startTime: body.startTime }),
      ...(body.endTime !== undefined && { endTime: body.endTime }),
      ...(body.isRecurring !== undefined && { isRecurring: body.isRecurring }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string; specialId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const special = await ownedSpecial(params.id, params.specialId, session.user.id)
  if (!special) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.placeSpecial.delete({ where: { id: params.specialId } })
  return NextResponse.json({ ok: true })
}
