import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Each user gets one shareable "top places" list for now. POST returns the
// existing one or creates it; DELETE revokes (deletes) it — the old link
// 404s immediately and a future POST mints a fresh slug.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const existing = await prisma.sharedList.findFirst({ where: { userId } })
  if (existing) return NextResponse.json({ slug: existing.slug })

  const firstName = session.user.name?.trim().split(/\s+/)[0] ?? 'My'
  const list = await prisma.sharedList.create({
    data: { userId, title: `${firstName}'s Top Places` },
  })
  return NextResponse.json({ slug: list.slug }, { status: 201 })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.sharedList.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
