import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PlaceDetailClient from './PlaceDetailClient'

export default async function PlaceDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const userId = session!.user!.id
  const [userPlace, allTags] = await Promise.all([
    prisma.userPlace.findFirst({
      where: { id: params.id, userId },
      include: {
        place: true,
        meals: { orderBy: { isFavorite: 'desc' } },
        visits: { orderBy: { visitedAt: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' }, take: 12 },
        tags: { include: { tag: true } },
      },
    }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])
  if (!userPlace) notFound()
  return <PlaceDetailClient userPlace={userPlace} allTags={allTags} />
}
