'use client'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { MapPlace } from './MapClient'

// Leaflet touches window/document, so it must never render on the server.
const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
})

export default function MapView({ places }: { places: MapPlace[] }) {
  return <MapClient places={places} />
}
