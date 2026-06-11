import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { Suspense } from 'react'
import { Bookmark, MapPin, Plus, Star, SearchX } from 'lucide-react'
import AddPlaceFab from '@/components/AddPlaceFab'
import EmptyState from '@/components/EmptyState'
import PlaceAvatar from '@/components/PlaceAvatar'
import PlacesFilters, { type SortKey } from './PlacesFilters'
import { cuisineChip } from '@/lib/places'

const SORT_ORDER: Record<SortKey, Prisma.UserPlaceOrderByWithRelationInput> = {
  recent: { updatedAt: 'desc' },
  top: { rating: { sort: 'desc', nulls: 'last' } },
  visited: { visits: { _count: 'desc' } },
  name: { place: { name: 'asc' } },
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string; price?: string }
}) {
  const session = await auth()
  const q = searchParams.q?.trim() ?? ''
  const sort: SortKey = (['recent', 'top', 'visited', 'name'] as const).includes(searchParams.sort as SortKey)
    ? (searchParams.sort as SortKey)
    : 'recent'
  const price = searchParams.price ? Number(searchParams.price) : null

  const where: Prisma.UserPlaceWhereInput = {
    userId: session!.user!.id,
    status: 'visited',
    ...(q && { place: { name: { contains: q, mode: 'insensitive' } } }),
    ...(price && { priceRange: price }),
  }

  const userPlaces = await prisma.userPlace.findMany({
    where,
    include: { place: true, _count: { select: { visits: true } } },
    orderBy: SORT_ORDER[sort],
  })

  const filtered = !!q || !!price
  const totalTracked = filtered ? await prisma.userPlace.count({ where: { userId: session!.user!.id, status: 'visited' } }) : userPlaces.length

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">My Places</h1>
        <div className="flex items-center gap-2">
          <Link href="/wishlist" aria-label="Wishlist" className="bg-white text-teal-600 border border-stone-200 rounded-full p-2.5 shadow-sm active:scale-95 transition">
            <Bookmark className="w-5 h-5" />
          </Link>
          <Link href="/places?add=true" className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-full p-2.5 shadow-lg shadow-orange-500/30 active:scale-95 transition">
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {totalTracked > 0 && <PlacesFilters q={q} sort={sort} price={price} />}

      {userPlaces.length === 0 ? (
        filtered ? (
          <EmptyState icon={SearchX} title="No matches" hint="Try a different search or clear your filters." className="py-16" />
        ) : (
          <EmptyState icon={MapPin} title="No places yet" hint="Tap + to add your first spot" className="py-20" />
        )
      ) : (
        <div className="space-y-3">
          {userPlaces.map(({ id, place, rating, priceRange, _count }) => (
            <Link key={id} href={`/places/${id}`} className="card block p-4 active:scale-[0.99] transition-all duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <PlaceAvatar place={place} size="md" />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-stone-900 truncate">{place.name}</h2>
                    {place.city && <p className="text-sm text-stone-400 mt-0.5">{place.city}{place.state ? `, ${place.state}` : ''}</p>}
                  </div>
                </div>
                {rating && (
                  <div className="flex items-center gap-1 text-orange-500 flex-shrink-0 bg-amber-50 rounded-full px-2 py-0.5">
                    <Star className="w-4 h-4 fill-orange-500" />
                    <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
                {(() => {
                  const chip = cuisineChip(place.cuisine)
                  return chip ? (
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">
                      <span>{chip.emoji}</span>{chip.label}
                    </span>
                  ) : null
                })()}
                {_count.visits > 0 && <span>{_count.visits} visit{_count.visits !== 1 ? 's' : ''}</span>}
                {priceRange && <span>{'$'.repeat(priceRange)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <AddPlaceFab />
      </Suspense>
    </div>
  )
}
