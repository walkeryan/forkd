import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Delete a tag entirely (cascades to its UserPlaceTag links).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tag = await prisma.tag.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.tag.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
