'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { Star } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

export interface MapPlace {
  id: string
  name: string
  lat: number
  lng: number
  rating: number | null
  city: string | null
  status: 'visited' | 'wishlist'
}

// Leaflet's default marker assets break under bundlers, so we draw our own
// colored pins as divIcons — orange for visited, blue for wishlist.
function pin(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20],
  })
}

const visitedIcon = pin('#f97316')
const wishlistIcon = pin('#3b82f6')

export default function MapClient({ places }: { places: MapPlace[] }) {
  // Center on the mean of all coordinates, falling back to a sane default.
  const center: [number, number] = places.length
    ? [
        places.reduce((s, p) => s + p.lat, 0) / places.length,
        places.reduce((s, p) => s + p.lng, 0) / places.length,
      ]
    : [40.4406, -79.9959] // Pittsburgh

  return (
    <MapContainer center={center} zoom={places.length ? 12 : 11} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((p) => (
        <Marker key={`${p.status}-${p.id}`} position={[p.lat, p.lng]} icon={p.status === 'visited' ? visitedIcon : wishlistIcon}>
          <Popup>
            <div className="min-w-[140px]">
              <p className="font-semibold text-gray-900">{p.name}</p>
              {p.city && <p className="text-xs text-gray-500">{p.city}</p>}
              <div className="flex items-center justify-between mt-1">
                {p.rating ? (
                  <span className="flex items-center gap-0.5 text-orange-500 text-xs font-semibold">
                    <Star className="w-3 h-3 fill-orange-500" /> {p.rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-xs text-blue-500 font-medium">Wishlist</span>
                )}
                <Link
                  href={p.status === 'visited' ? `/places/${p.id}` : '/wishlist'}
                  className="text-xs font-semibold text-orange-600"
                >
                  View →
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
