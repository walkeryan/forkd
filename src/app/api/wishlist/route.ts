import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Add a place to the user's want-to-try list. Mirrors POST /api/places but
// creates a WishlistItem instead of a visited UserPlace.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { googlePlaceId, name, address, city, state, lat, lng, placeType, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  let place = googlePlaceId
    ? await prisma.place.findUnique({ where: { googlePlaceId } })
    : null

  if (place) {
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_placeId: { userId, placeId: place.id } },
    })
    if (existing) {
      return NextResponse.json({ wishlistItemId: existing.id, existing: true })
    }
  } else {
    place = await prisma.place.create({
      data: { name, address, city, state, lat, lng, cuisine: placeType || undefined, googlePlaceId: googlePlaceId || undefined },
    })
  }

  const item = await prisma.wishlistItem.create({
    data: { userId, placeId: place.id, notes },
  })
  return NextResponse.json({ wishlistItemId: item.id }, { status: 201 })
}
