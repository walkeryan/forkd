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
  photoReference: string | null
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
  photos?: { photo_reference: string }[]
}

// Map a Google place type (e.g. "ramen_restaurant") to a food emoji. The first
// keyword that matches wins, so order specific terms before generic ones.
const CUISINE_EMOJI: [string, string][] = [
  ['ramen', '🍜'], ['noodle', '🍜'], ['pho', '🍜'], ['vietnamese', '🍜'],
  ['sushi', '🍣'], ['japanese', '🍣'], ['seafood', '🦞'], ['fish', '🐟'],
  ['pizza', '🍕'], ['italian', '🍝'],
  ['burger', '🍔'], ['hamburger', '🍔'], ['fast_food', '🍔'], ['american', '🍔'],
  ['taco', '🌮'], ['mexican', '🌮'],
  ['chinese', '🥡'], ['dumpling', '🥟'],
  ['thai', '🍛'], ['indian', '🍛'], ['curry', '🍛'],
  ['korean', '🍲'], ['hot_pot', '🍲'], ['soup', '🍲'],
  ['steak', '🥩'], ['barbecue', '🍖'], ['bbq', '🍖'], ['meat', '🥩'],
  ['breakfast', '🍳'], ['brunch', '🍳'],
  ['bakery', '🥐'], ['sandwich', '🥪'], ['deli', '🥪'],
  ['coffee', '☕'], ['cafe', '☕'], ['café', '☕'], ['tea', '🍵'],
  ['ice_cream', '🍦'], ['dessert', '🍰'], ['donut', '🍩'],
  ['bar', '🍸'], ['pub', '🍺'], ['brewery', '🍺'], ['wine', '🍷'],
  ['vegetarian', '🥗'], ['vegan', '🥗'], ['salad', '🥗'],
  ['chicken', '🍗'], ['french', '🥖'],
  ['restaurant', '🍽️'], ['food', '🍽️'], ['meal', '🍽️'],
]

export interface CuisineChip {
  emoji: string
  label: string
}

export function cuisineChip(cuisine: string | null | undefined): CuisineChip | null {
  if (!cuisine) return null
  const key = cuisine.toLowerCase()
  const match = CUISINE_EMOJI.find(([term]) => key.includes(term))
  const label = cuisine
    .replace(/_/g, ' ')
    .replace(/\brestaurant\b/i, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return { emoji: match?.[1] ?? '🍽️', label: label || 'Restaurant' }
}

export function normalizeGooglePlace(result: GooglePlace): NearbyPlace {
  return {
    googlePlaceId: result.place_id,
    name: result.name,
    address: result.vicinity ?? result.formatted_address ?? '',
    placeType: result.types?.[0] ?? 'restaurant',
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    photoReference: result.photos?.[0]?.photo_reference ?? null,
  }
}
