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
        meals: { orderBy: { isFavorite: 'desc' }, include: { photos: { orderBy: { createdAt: 'desc' } } } },
        visits: { orderBy: { visitedAt: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' }, take: 12 },
        tags: { include: { tag: true } },
      },
    }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ])
  if (!userPlace) notFound()
  const specials = await prisma.placeSpecial.findMany({
    where: { placeId: userPlace.placeId },
    orderBy: [{ dayOfWeek: 'asc' }, { createdAt: 'asc' }],
  })
  return <PlaceDetailClient userPlace={userPlace} allTags={allTags} specials={specials} />
}
