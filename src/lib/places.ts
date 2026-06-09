// Helpers for the server-side place-search proxy routes.
// Uses the Google Places API (legacy).

/** Normalized shape returned to the client. */
export interface NearbyPlace {
  googlePlaceId: string
  name: string
  address: string
  placeType: string
  lat: number | null
  lng: number | null
}

interface GooglePlaceGeometry {
  location: {
    lat: number
    lng: number
  }
}

export interface GooglePlace {
  place_id: string
  name: string
  vicinity?: string           // present in Nearby Search results
  formatted_address?: string  // present in Text Search results
  geometry: GooglePlaceGeometry
  types?: string[]
  business_status?: string
}

export function normalizeGooglePlace(result: GooglePlace): NearbyPlace {
  return {
    googlePlaceId: result.place_id,
    name: result.name,
    address: result.vicinity ?? result.formatted_address ?? '',
    placeType: result.types?.[0] ?? 'restaurant',
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  }
}
