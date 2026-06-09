import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Map as MapIcon } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import MapView from './MapView'
import type { MapPlace } from './MapClient'

export default async function MapPage() {
  const session = await auth()
  const userId = session!.user!.id

  const [userPlaces, wishlist] = await Promise.all([
    prisma.userPlace.findMany({
      where: { userId, status: 'visited' },
      include: { place: true },
    }),
    prisma.wishlistItem.findMany({
      where: { userId },
      include: { place: true },
    }),
  ])

  // Only places with real coordinates can be pinned (manual entries may lack them).
  const places: MapPlace[] = [
    ...userPlaces
      .filter((up) => up.place.lat != null && up.place.lng != null)
      .map((up) => ({
        id: up.id,
        name: up.place.name,
        lat: up.place.lat as number,
        lng: up.place.lng as number,
        rating: up.rating,
        city: up.place.city,
        status: 'visited' as const,
      })),
    ...wishlist
      .filter((w) => w.place.lat != null && w.place.lng != null)
      .map((w) => ({
        id: w.id,
        name: w.place.name,
        lat: w.place.lat as number,
        lng: w.place.lng as number,
        rating: null,
        city: w.place.city,
        status: 'wishlist' as const,
      })),
  ]

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Map</h1>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Visited</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Wishlist</span>
        </div>
      </div>
      {places.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <EmptyState icon={MapIcon} title="Nothing to map yet" hint="Add places with a location and they’ll show up here." />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MapView places={places} />
        </div>
      )}
    </div>
  )
}
