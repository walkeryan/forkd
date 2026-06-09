import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { normalizeGooglePlace, type GooglePlace } from '@/lib/places'

const NEARBY_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'config', message: 'Google Places is not configured — ask the server administrator to add GOOGLE_PLACES_API_KEY.' },
      { status: 500 },
    )
  }

  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  try {
    const url = new URL(NEARBY_ENDPOINT)
    url.searchParams.set('location', `${lat},${lng}`)
    url.searchParams.set('radius', '1500')
    url.searchParams.set('type', 'restaurant')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'upstream', message: 'Places service is busy -- try again in a moment.' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const results = ((data.results ?? []) as GooglePlace[])
      .filter((r) => r.business_status !== 'CLOSED_PERMANENTLY')
      .map(normalizeGooglePlace)

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json(
      { error: 'upstream', message: 'Failed to reach Places service.' },
      { status: 502 },
    )
  }
}
