'use client'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { MapPlace } from './MapClient'

// The Maps JS SDK requires window, so this must never render on the server.
const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
})

export default function MapView({ places, center }: { places: MapPlace[]; center: { lat: number; lng: number } }) {
  return <MapClient places={places} center={center} />
}
