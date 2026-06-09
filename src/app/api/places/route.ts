import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userPlaces = await prisma.userPlace.findMany({
    where: { userId: session.user.id },
    include: { place: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(userPlaces)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { googlePlaceId, name, address, city, state, lat, lng, placeType, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  // If this place was picked from Google, dedupe on googlePlaceId so the same
  // restaurant isn't created twice.
  let place = googlePlaceId
    ? await prisma.place.findUnique({ where: { googlePlaceId } })
    : null

  if (place) {
    // The user may already track this place — if so, return the existing one
    // rather than creating a duplicate UserPlace.
    const existing = await prisma.userPlace.findUnique({
      where: { userId_placeId: { userId, placeId: place.id } },
    })
    if (existing) {
      return NextResponse.json({ userPlaceId: existing.id, existing: true })
    }
  } else {
    place = await prisma.place.create({
      data: { name, address, city, state, lat, lng, googlePlaceId: googlePlaceId || undefined },
    })
  }

  const userPlace = await prisma.userPlace.create({
    data: { userId, placeId: place.id, notes, status: 'visited' },
  })
  return NextResponse.json({ userPlaceId: userPlace.id }, { status: 201 })
}
