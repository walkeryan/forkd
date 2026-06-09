import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Confirm the meal belongs to a place owned by the current user.
async function ownedMeal(id: string, userId: string) {
  return prisma.meal.findFirst({ where: { id, userPlace: { userId } } })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meal = await ownedMeal(params.id, session.user.id)
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.meal.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.serviceRating !== undefined && { serviceRating: body.serviceRating }),
      ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.serviceNotes !== undefined && { serviceNotes: body.serviceNotes }),
      ...(body.managementNotes !== undefined && { managementNotes: body.managementNotes }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const meal = await ownedMeal(params.id, session.user.id)
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.meal.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
