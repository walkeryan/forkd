import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// List the user's tags (for autocomplete suggestions).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tags = await prisma.tag.findMany({ where: { userId: session.user.id }, orderBy: { name: 'asc' } })
  return NextResponse.json(tags)
}

// Create a standalone tag.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  const trimmed = (name ?? '').trim()
  if (!trimmed) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const tag = await prisma.tag.upsert({
    where: { name_userId: { name: trimmed, userId: session.user.id } },
    create: { name: trimmed, userId: session.user.id },
    update: {},
  })
  return NextResponse.json(tag, { status: 201 })
}
