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
      include: { place: true, _count: { select: { visits: true } } },
      // Most recently visited first so it can seed the default map center.
      orderBy: { lastVisited: { sort: 'desc', nulls: 'last' } },
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
        placeId: up.place.id,
        name: up.place.name,
        lat: up.place.lat as number,
        lng: up.place.lng as number,
        rating: up.rating,
        city: up.place.city,
        cuisine: up.place.cuisine,
        visitCount: up._count.visits,
        status: 'visited' as const,
        website: up.place.website,
        imagePath: up.place.imagePath,
      })),
    ...wishlist
      .filter((w) => w.place.lat != null && w.place.lng != null)
      .map((w) => ({
        id: w.id,
        placeId: w.place.id,
        name: w.place.name,
        lat: w.place.lat as number,
        lng: w.place.lng as number,
        rating: null,
        city: w.place.city,
        cuisine: w.place.cuisine,
        visitCount: 0,
        status: 'wishlist' as const,
        website: w.place.website,
        imagePath: w.place.imagePath,
      })),
  ]

  // Center on the most recently visited place, else the first pinned place,
  // else New York City.
  const center = places.length ? { lat: places[0].lat, lng: places[0].lng } : { lat: 40.7128, lng: -74.006 }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Map</h1>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-full px-2.5 py-1 border border-stone-200/60 shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Visited</span>
          <span className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-full px-2.5 py-1 border border-stone-200/60 shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Wishlist</span>
        </div>
      </div>
      {places.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <EmptyState icon={MapIcon} title="Nothing to map yet" hint="Add places with a location and they’ll show up here." />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-t-3xl border-t border-stone-200/60 shadow-[0_-2px_12px_rgba(28,25,23,0.06)]">
          <MapView places={places} center={center} />
        </div>
      )}
    </div>
  )
}
