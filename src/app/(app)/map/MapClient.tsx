'use client'
import { useCallback, useEffect, useState } from 'react'
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api'
import Link from 'next/link'
import { Star, Loader2, MapPin } from 'lucide-react'
import { cuisineChip } from '@/lib/places'

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
const WISHLIST_COLOR = '#3b82f6'

/** Brand favicon for a place website (matches PlaceAvatar's logo source). */
function faviconUrl(website: string): string | null {
  try {
    const domain = new URL(website.includes('://') ? website : `https://${website}`).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
  } catch {
    return null
  }
}

export default function MapClient({ places, center }: { places: MapPlace[]; center: { lat: number; lng: number } }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  })

  const [selected, setSelected] = useState<MapPlace | null>(null)

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

  // Marker icon: the place's cached photo, else its brand favicon, else a
  // coloured circle keyed to visited/wishlist status.
  const iconFor = useCallback((p: MapPlace) => {
    if (typeof google === 'undefined') return undefined
    const imageUrl = p.imagePath
      ? `/api/place-images/${p.placeId}`
      : p.website
        ? faviconUrl(p.website)
        : null
    if (imageUrl) {
      return {
        url: imageUrl,
        scaledSize: new google.maps.Size(34, 34),
        anchor: new google.maps.Point(17, 17),
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
                <span className="text-[11px] text-blue-600 font-medium">Wishlist</span>
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
            <Link
              href={selected.status === 'visited' ? `/places/${selected.id}` : '/wishlist'}
              className="inline-block mt-2 text-xs font-semibold text-orange-600"
            >
              View →
            </Link>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  )
}
