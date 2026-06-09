import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Resolve the [id] (a UserPlace owned by the current user) to its underlying
// Place, since specials hang off the shared Place, not the per-user record.
async function ownedPlaceId(userPlaceId: string, userId: string) {
  const up = await prisma.userPlace.findFirst({ where: { id: userPlaceId, userId }, select: { placeId: true } })
  return up?.placeId ?? null
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const placeId = await ownedPlaceId(params.id, session.user.id)
  if (!placeId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const specials = await prisma.placeSpecial.findMany({
    where: { placeId },
    orderBy: [{ dayOfWeek: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(specials)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const placeId = await ownedPlaceId(params.id, session.user.id)
  if (!placeId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { type, title, description, dayOfWeek, startTime, endTime, isRecurring } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const special = await prisma.placeSpecial.create({
    data: {
      placeId,
      type: type || 'other',
      title: title.trim(),
      description: description?.trim() || null,
      dayOfWeek: dayOfWeek ?? null,
      startTime: startTime?.trim() || null,
      endTime: endTime?.trim() || null,
      isRecurring: isRecurring ?? true,
    },
  })
  return NextResponse.json(special, { status: 201 })
}
