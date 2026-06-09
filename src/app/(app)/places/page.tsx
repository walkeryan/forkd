import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Suspense } from 'react'
import { MapPin, Plus, Star } from 'lucide-react'
import AddPlaceFab from '@/components/AddPlaceFab'

export default async function PlacesPage() {
  const session = await auth()
  const userPlaces = await prisma.userPlace.findMany({
    where: { userId: session!.user!.id, status: 'visited' },
    include: { place: true },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Places</h1>
        <Link href="/places?add=true" className="bg-orange-500 text-white rounded-full p-2 shadow">
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {userPlaces.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No places yet</p>
          <p className="text-sm mt-1">Tap + to add your first spot</p>
        </div>
      ) : (
        <div className="space-y-3">
          {userPlaces.map(({ id, place, rating, priceRange, visitCount }) => (
            <Link key={id} href={`/places/${id}`} className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{place.name}</h2>
                  {place.city && <p className="text-sm text-gray-400 mt-0.5">{place.city}{place.state ? `, ${place.state}` : ''}</p>}
                </div>
                {rating && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <Star className="w-4 h-4 fill-orange-500" />
                    <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                {visitCount > 0 && <span>{visitCount} visit{visitCount !== 1 ? 's' : ''}</span>}
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
