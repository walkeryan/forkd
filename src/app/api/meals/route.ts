import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userPlaceId, name, description, isFavorite, rating, serviceRating, notes, serviceNotes, managementNotes } =
    await req.json()
  const up = await prisma.userPlace.findFirst({ where: { id: userPlaceId, userId: session.user.id } })
  if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const meal = await prisma.meal.create({
    data: {
      userPlaceId,
      name,
      description,
      isFavorite: isFavorite ?? false,
      ...(rating != null && { rating }),
      ...(serviceRating != null && { serviceRating }),
      ...(notes != null && { notes }),
      ...(serviceNotes != null && { serviceNotes }),
      ...(managementNotes != null && { managementNotes }),
    },
  })
  return NextResponse.json(meal, { status: 201 })
}
