import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const item = await prisma.wishlistItem.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.wishlistItem.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

// Promote a wishlist item to a visited place: reuse the existing Place row (so
// manual entries aren't duplicated), create/return the UserPlace, and remove
// the wishlist item. An optional first visit is logged when visitedAt is given.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const item = await prisma.wishlistItem.findFirst({ where: { id: params.id, userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const visitedAt: string | undefined = body?.visitedAt

  const userPlace = await prisma.userPlace.upsert({
    where: { userId_placeId: { userId, placeId: item.placeId } },
    create: { userId, placeId: item.placeId, notes: item.notes, status: 'visited' },
    update: { status: 'visited' },
  })

  if (visitedAt) {
    await prisma.visit.create({ data: { userPlaceId: userPlace.id, visitedAt: new Date(visitedAt) } })
    const count = await prisma.visit.count({ where: { userPlaceId: userPlace.id } })
    await prisma.userPlace.update({
      where: { id: userPlace.id },
      data: { visitCount: count, lastVisited: new Date(visitedAt) },
    })
  }

  await prisma.wishlistItem.delete({ where: { id: item.id } })
  return NextResponse.json({ userPlaceId: userPlace.id }, { status: 201 })
}
