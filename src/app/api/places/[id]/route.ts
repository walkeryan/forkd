import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const up = await prisma.userPlace.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.userPlace.update({
    where: { id: params.id },
    data: {
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.priceRange !== undefined && { priceRange: body.priceRange }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const up = await prisma.userPlace.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!up) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.userPlace.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
