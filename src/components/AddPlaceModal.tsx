'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, Search, X, Loader2, LocateFixed, PenLine, Check, Bookmark } from 'lucide-react'
import { cuisineChip } from '@/lib/places'
import MealForm from '@/components/MealForm'

type AddMode = 'visited' | 'wishlist'

interface PlaceResult {
  googlePlaceId: string
  name: string
  address: string
  placeType: string
  lat: number | null
  lng: number | null
  photoReference: string | null
}

// Search-result thumbnail served through the cached preview proxy, falling
// back to the generic pin while loading-less or on error.
function ResultThumb({ place }: { place: PlaceResult }) {
  const [failed, setFailed] = useState(false)
  if (!place.photoReference || failed) {
    return (
      <div className="bg-orange-50 rounded-xl p-2 mt-0.5 flex-shrink-0">
        <MapPin className="w-4 h-4 text-orange-500" />
      </div>
    )
  }
  return (
    <img
      src={`/api/places/preview-photo?placeId=${encodeURIComponent(place.googlePlaceId)}&ref=${encodeURIComponent(place.photoReference)}`}
      alt=""
      onError={() => setFailed(true)}
      className="w-10 h-10 rounded-xl object-cover bg-gray-100 mt-0.5 flex-shrink-0"
    />
  )
}

interface Coords {
  lat: number
  lng: number
}

// Great-circle distance between two points in miles (Haversine formula).
function haversineMiles(a: Coords, b: Coords): number {
  const R = 3958.8 // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function AddPlaceModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (id: string, mode: AddMode) => void
}) {
  const [mode, setMode] = useState<AddMode>('visited')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locating, setLocating] = useState(false)
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [canRetryLocation, setCanRetryLocation] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ name: '', address: '' })
  // After adding a visited place we stay open on a meal-logging step.
  const [step, setStep] = useState<'search' | 'meal'>('search')
  const [addedPlace, setAddedPlace] = useState<{ userPlaceId: string; name: string; cuisine: string | null } | null>(null)

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
        if (data.results.length === 0) setError('No restaurants found nearby — try a search instead.')
      }
    } catch {
      setError('Places search unavailable')
    } finally {
      setLoadingNearby(false)
    }
  }, [])

  // Ask for the user's location and, on success, load nearby restaurants.
  const requestLocation = useCallback(() => {
    setError(null)
    setCanRetryLocation(false)
    if (!('geolocation' in navigator)) {
      setError('Location unavailable — search for a restaurant below.')
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
        setCanRetryLocation(true)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied — search for a restaurant below.'
            : 'Couldn’t find your location — search for a restaurant below.',
        )
      },
      // Fall back to the search bar if location takes longer than 8 seconds.
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [fetchNearby])

  // Reset state and auto-request location whenever the modal is reopened.
  useEffect(() => {
    if (!open) return
    setMode('visited')
    setCoords(null)
    setLocating(false)
    setLoadingNearby(false)
    setResults([])
    setError(null)
    setCanRetryLocation(false)
    setQuery('')
    setSearching(false)
    setCreatingId(null)
    setManualOpen(false)
    setManual({ name: '', address: '' })
    setStep('search')
    setAddedPlace(null)
    requestLocation()
  }, [open, requestLocation])

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

  async function createPlace(
    payload: Record<string, unknown>,
    key: string,
    display: { name: string; cuisine: string | null },
  ) {
    setCreatingId(key)
    setError(null)
    try {
      const endpoint = mode === 'wishlist' ? '/api/wishlist' : '/api/places'
      const res = await fetch(endpoint, {
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
      // Wishlist adds close immediately; visited adds move to a meal-log step.
      if (mode === 'wishlist') {
        onSuccess(data.wishlistItemId, mode)
        return
      }
      setCreatingId(null)
      setAddedPlace({ userPlaceId: data.userPlaceId, name: display.name, cuisine: display.cuisine })
      setStep('meal')
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
      { name: p.name, cuisine: p.placeType || null },
    )
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manual.name.trim()) return
    createPlace({ name: manual.name.trim(), address: manual.address.trim() }, 'manual', {
      name: manual.name.trim(),
      cuisine: null,
    })
  }

  // Finish the meal step — whether the user logged a meal or skipped — by
  // handing the new place's id back to the parent for navigation.
  function finishMealStep() {
    if (addedPlace) onSuccess(addedPlace.userPlaceId, 'visited')
  }

  if (!open) return null

  // Attach distance from the user (when known) and sort closest-first.
  const displayResults = results
    .map((p) => ({
      place: p,
      distance:
        coords && p.lat != null && p.lng != null
          ? haversineMiles(coords, { lat: p.lat, lng: p.lng })
          : null,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

  const showSpinner = locating || loadingNearby

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'meal' ? 'Log a Meal' : 'Add a Place'}
          </h2>
          <button onClick={step === 'meal' ? finishMealStep : onClose} className="text-gray-400 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'meal' && addedPlace ? (
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">You&apos;re at {addedPlace.name}! What did you have?</h3>
              <p className="text-sm text-gray-400 mt-0.5">Log your dish now, or skip and add it later.</p>
            </div>
            <MealForm
              userPlaceId={addedPlace.userPlaceId}
              placeName={addedPlace.name}
              cuisine={addedPlace.cuisine}
              autoFocus
              submitLabel="Add Meal"
              onSaved={finishMealStep}
            />
            <button
              onClick={finishMealStep}
              className="w-full text-center text-sm text-gray-500 py-1 active:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        ) : (
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Visited vs. wishlist toggle */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setMode('visited')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${mode === 'visited' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
            >
              <Check className="w-4 h-4" /> Visited
            </button>
            <button
              onClick={() => setMode('wishlist')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${mode === 'wishlist' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <Bookmark className="w-4 h-4" /> Wishlist
            </button>
          </div>

          {/* Secondary search — nearby restaurants load automatically on open. */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a restaurant…"
              className="w-full border border-gray-300 rounded-xl pl-9 pr-9 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>

          {error && (
            <div className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 space-y-2">
              <p>{error}</p>
              {canRetryLocation && (
                <button
                  onClick={requestLocation}
                  className="inline-flex items-center gap-1.5 text-orange-600 font-medium"
                >
                  <LocateFixed className="w-4 h-4" /> Use my location
                </button>
              )}
            </div>
          )}

          {/* Locating / nearby loading spinner */}
          {showSpinner && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Finding restaurants near you…
            </div>
          )}

          {/* Results */}
          {!showSpinner && displayResults.length > 0 && (
            <div className="space-y-2">
              {displayResults.map(({ place: p, distance }) => {
                const chip = cuisineChip(p.placeType)
                const meta = [
                  distance != null ? `${distance.toFixed(1)} mi` : null,
                  chip?.label,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <button
                    key={p.googlePlaceId}
                    onClick={() => pickPlace(p)}
                    disabled={creatingId !== null}
                    className="w-full text-left flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm disabled:opacity-60"
                  >
                    <ResultThumb place={p} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      {meta && <p className="text-xs text-gray-500 mt-0.5">{meta}</p>}
                      {p.address && <p className="text-xs text-gray-400 truncate">{p.address}</p>}
                    </div>
                    {creatingId === p.googlePlaceId && (
                      <Loader2 className="w-4 h-4 text-orange-500 animate-spin mt-1" />
                    )}
                  </button>
                )
              })}
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
        )}
      </div>
    </div>
  )
}
