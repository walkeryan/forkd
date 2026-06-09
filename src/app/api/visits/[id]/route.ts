import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Confirm the visit belongs to a place owned by the current user.
async function ownedVisit(id: string, userId: string) {
  return prisma.visit.findFirst({ where: { id, userPlace: { userId } } })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const visit = await ownedVisit(params.id, session.user.id)
  if (!visit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.visit.update({
    where: { id: params.id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.visitedAt !== undefined && { visitedAt: new Date(body.visitedAt) }),
    },
  })

  // Keep lastVisited consistent with the most recent remaining visit.
  await syncLastVisited(visit.userPlaceId)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const visit = await ownedVisit(params.id, session.user.id)
  if (!visit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.visit.delete({ where: { id: params.id } })

  // Decrement the denormalized counter and recompute lastVisited from what's left.
  const remaining = await prisma.visit.count({ where: { userPlaceId: visit.userPlaceId } })
  await prisma.userPlace.update({
    where: { id: visit.userPlaceId },
    data: { visitCount: remaining },
  })
  await syncLastVisited(visit.userPlaceId)
  return NextResponse.json({ ok: true })
}

// Recompute lastVisited as the newest remaining visit (or null if none).
async function syncLastVisited(userPlaceId: string) {
  const latest = await prisma.visit.findFirst({
    where: { userPlaceId },
    orderBy: { visitedAt: 'desc' },
    select: { visitedAt: true },
  })
  await prisma.userPlace.update({
    where: { id: userPlaceId },
    data: { lastVisited: latest?.visitedAt ?? null },
  })
}
