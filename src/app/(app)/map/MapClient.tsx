'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api'
import Link from 'next/link'
import { Star, Loader2, MapPin, Plus, X } from 'lucide-react'
import { cuisineChip } from '@/lib/places'
import MealForm from '@/components/MealForm'

export interface MapPlace {
  id: string
  placeId: string
  name: string
  lat: number
  lng: number
  rating: number | null
  city: string | null
  cuisine: string | null
  visitCount: number
  status: 'visited' | 'wishlist'
  website: string | null
  imagePath: string | null
}

const containerStyle = { width: '100%', height: '100%' }

const VISITED_COLOR = '#f97316'
const WISHLIST_COLOR = '#0d9488'

export default function MapClient({ places, center }: { places: MapPlace[]; center: { lat: number; lng: number } }) {
  const router = useRouter()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  })

  const [selected, setSelected] = useState<MapPlace | null>(null)
  // Place a meal is being logged at, straight from its map pin.
  const [mealPlace, setMealPlace] = useState<MapPlace | null>(null)

  // Surface auth/config failures (bad key, Maps JS API not enabled, referrer
  // restrictions). Google calls this global instead of rejecting the loader.
  useEffect(() => {
    const w = window as unknown as { gm_authFailure?: () => void }
    w.gm_authFailure = () => {
      console.error(
        "[Fork'd] Google Maps failed to authenticate. Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is correct and that the \"Maps JavaScript API\" is enabled (and not referrer-restricted) on the Google Cloud project.",
      )
    }
    return () => {
      delete w.gm_authFailure
    }
  }, [])

  useEffect(() => {
    if (loadError) {
      console.error("[Fork'd] Google Maps JS failed to load:", loadError)
    }
  }, [loadError])

  // Marker icon: a server-rendered circular badge (place photo or brand
  // favicon inside a white ring). Places with neither get a coloured dot.
  const iconFor = useCallback((p: MapPlace) => {
    if (typeof google === 'undefined') return undefined
    if (p.imagePath || p.website) {
      return {
        url: `/api/map-markers/${p.placeId}?c=${p.status}`,
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18),
      }
    }
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: p.status === 'visited' ? VISITED_COLOR : WISHLIST_COLOR,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 8,
    }
  }, [])

  if (!apiKey) {
    console.error("[Fork'd] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — the map cannot load.")
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
        <MapPin className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Map unavailable — missing Google Maps API key.</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
        <MapPin className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Couldn&apos;t load Google Maps. Check the API key and that the Maps JavaScript API is enabled.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <>
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={places.length ? 12 : 11}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      onClick={() => setSelected(null)}
    >
      {places.map((p) => (
        <MarkerF
          key={`${p.status}-${p.id}`}
          position={{ lat: p.lat, lng: p.lng }}
          icon={iconFor(p)}
          onClick={() => setSelected(p)}
        />
      ))}

      {selected && (
        <InfoWindowF position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelected(null)}>
          <div className="min-w-[150px] pr-1">
            <p className="font-semibold text-gray-900">{selected.name}</p>
            {selected.city && <p className="text-xs text-gray-500">{selected.city}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {(() => {
                const chip = cuisineChip(selected.cuisine)
                return chip ? (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-[11px]">
                    <span>{chip.emoji}</span>{chip.label}
                  </span>
                ) : null
              })()}
              {selected.status === 'wishlist' && (
                <span className="text-[11px] text-teal-600 font-medium">Wishlist</span>
              )}
              {selected.rating != null && (
                <span className="inline-flex items-center gap-0.5 text-orange-500 text-[11px] font-semibold">
                  <Star className="w-3 h-3 fill-orange-500" />{selected.rating.toFixed(1)}
                </span>
              )}
              {selected.status === 'visited' && selected.visitCount > 0 && (
                <span className="text-[11px] text-gray-500">
                  {selected.visitCount} visit{selected.visitCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              {selected.status === 'visited' && (
                <button
                  onClick={() => { setMealPlace(selected); setSelected(null) }}
                  className="inline-flex items-center gap-1 bg-gradient-to-b from-orange-500 to-orange-600 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 shadow-sm shadow-orange-500/20 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Log a Meal
                </button>
              )}
              <Link
                href={selected.status === 'visited' ? `/places/${selected.id}` : '/wishlist'}
                className="inline-block text-xs font-semibold text-orange-600"
              >
                View →
              </Link>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>

    {/* Log-a-meal sheet, opened from a map pin */}
    {mealPlace && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={() => setMealPlace(null)} />
        <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-stone-950/20 max-h-[88vh] flex flex-col animate-rise">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-200 sm:hidden" />
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-200/60">
            <h2 className="text-lg font-bold tracking-tight text-stone-900">
              Log a Meal at <span className="text-orange-600">{mealPlace.name}</span>
            </h2>
            <button onClick={() => setMealPlace(null)} className="text-stone-400 p-1" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">
            <MealForm
              userPlaceId={mealPlace.id}
              placeName={mealPlace.name}
              cuisine={mealPlace.cuisine}
              autoFocus
              submitLabel="Add Meal"
              onSaved={() => { setMealPlace(null); router.refresh() }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  )
}
