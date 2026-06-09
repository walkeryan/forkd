'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, Search, X, Loader2, LocateFixed, PenLine } from 'lucide-react'

interface PlaceResult {
  googlePlaceId: string
  name: string
  address: string
  placeType: string
  lat: number | null
  lng: number | null
}

interface Coords {
  lat: number
  lng: number
}

export default function AddPlaceModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (userPlaceId: string) => void
}) {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locating, setLocating] = useState(false)
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ name: '', address: '' })

  // Reset state whenever the modal is reopened.
  useEffect(() => {
    if (open) {
      setCoords(null)
      setLocating(false)
      setLoadingNearby(false)
      setResults([])
      setError(null)
      setQuery('')
      setSearching(false)
      setCreatingId(null)
      setManualOpen(false)
      setManual({ name: '', address: '' })
    }
  }, [open])

  const fetchNearby = useCallback(async (c: Coords) => {
    setLoadingNearby(true)
    setError(null)
    try {
      const res = await fetch(`/api/places/nearby?lat=${c.lat}&lng=${c.lng}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Places search unavailable')
        setResults([])
      } else {
        setResults(data.results)
        if (data.results.length === 0) setError('No places found nearby — try a search instead.')
      }
    } catch {
      setError('Places search unavailable')
    } finally {
      setLoadingNearby(false)
    }
  }, [])

  function useMyLocation() {
    setError(null)
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        setLocating(false)
        fetchNearby(c)
      },
      (err) => {
        setLocating(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. You can search by name instead.'
            : 'Could not get your location. You can search by name instead.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Debounced text search.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      setError(null)
      try {
        const params = new URLSearchParams({ query: q })
        if (coords) {
          params.set('lat', String(coords.lat))
          params.set('lng', String(coords.lng))
        }
        const res = await fetch(`/api/places/search?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.message || 'Places search unavailable')
          setResults([])
        } else {
          setResults(data.results)
        }
      } catch {
        setError('Places search unavailable')
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, coords])

  async function createPlace(payload: Record<string, unknown>, key: string) {
    setCreatingId(key)
    setError(null)
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not add place')
        setCreatingId(null)
        return
      }
      onSuccess(data.userPlaceId)
    } catch {
      setError('Could not add place')
      setCreatingId(null)
    }
  }

  function pickPlace(p: PlaceResult) {
    createPlace(
      {
        googlePlaceId: p.googlePlaceId,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        placeType: p.placeType,
      },
      p.googlePlaceId,
    )
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manual.name.trim()) return
    createPlace({ name: manual.name.trim(), address: manual.address.trim() }, 'manual')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add a Place</h2>
          <button onClick={onClose} className="text-gray-400 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Location + search controls */}
          <button
            onClick={useMyLocation}
            disabled={locating || loadingNearby}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60"
          >
            {locating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Getting your location…
              </>
            ) : (
              <>
                <LocateFixed className="w-4 h-4" /> Use my location
              </>
            )}
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full border border-gray-300 rounded-xl pl-9 pr-9 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>

          {error && <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Nearby loading spinner */}
          {loadingNearby && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Finding places nearby…
            </div>
          )}

          {/* Results */}
          {!loadingNearby && results.length > 0 && (
            <div className="space-y-2">
              {results.map((p) => (
                <button
                  key={p.googlePlaceId}
                  onClick={() => pickPlace(p)}
                  disabled={creatingId !== null}
                  className="w-full text-left flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm disabled:opacity-60"
                >
                  <div className="bg-orange-50 rounded-xl p-2 mt-0.5">
                    <MapPin className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                    {p.address && <p className="text-xs text-gray-400 truncate">{p.address}</p>}
                    {p.placeType && (
                      <span className="inline-block mt-1 text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 capitalize">
                        {p.placeType}
                      </span>
                    )}
                  </div>
                  {creatingId === p.googlePlaceId && (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin mt-1" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Manual entry fallback */}
          <div className="border-t border-gray-100 pt-3">
            {!manualOpen ? (
              <button
                onClick={() => setManualOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 py-2"
              >
                <PenLine className="w-4 h-4" /> Enter manually instead
              </button>
            ) : (
              <form onSubmit={submitManual} className="space-y-2">
                <input
                  required
                  value={manual.name}
                  onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                  placeholder="Place name *"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  value={manual.address}
                  onChange={(e) => setManual((m) => ({ ...m, address: e.target.value }))}
                  placeholder="Address (optional)"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  type="submit"
                  disabled={creatingId !== null || !manual.name.trim()}
                  className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingId === 'manual' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Add Place
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
