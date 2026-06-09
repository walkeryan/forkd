import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userPlaceId, notes, visitedAt } = await req.json()
  const up = await prisma.userPlace.findFirst({ where: { id: userPlaceId, userId: session.user.id } })
  if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const visit = await prisma.visit.create({
    data: { userPlaceId, notes, visitedAt: visitedAt ? new Date(visitedAt) : new Date() },
  })
  await prisma.userPlace.update({
    where: { id: userPlaceId },
    data: { visitCount: { increment: 1 }, lastVisited: new Date() },
  })
  return NextResponse.json(visit, { status: 201 })
}
