import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft, MapPin, CalendarCheck, UtensilsCrossed, Camera, Star, Trophy } from 'lucide-react'
import { cuisineChip } from '@/lib/places'
import ShareRecapButton from '@/components/ShareRecapButton'

export const metadata = { title: 'Year in Food' }

export default async function RecapPage() {
  const session = await auth()
  const userId = session!.user!.id
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? 'You'

  const year = new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)

  const [visits, meals, photoCount] = await Promise.all([
    prisma.visit.findMany({
      where: { userPlace: { userId }, visitedAt: { gte: yearStart } },
      include: { userPlace: { include: { place: true } } },
    }),
    prisma.meal.findMany({
      where: { userPlace: { userId }, createdAt: { gte: yearStart } },
      select: { name: true, rating: true },
    }),
    prisma.photo.count({ where: { userId, createdAt: { gte: yearStart } } }),
  ])

  // Top place by visits this year.
  const placeVisits = new Map<string, { name: string; cuisine: string | null; count: number; href: string }>()
  for (const v of visits) {
    const key = v.userPlace.id
    const entry = placeVisits.get(key) ?? { name: v.userPlace.place.name, cuisine: v.userPlace.place.cuisine, count: 0, href: `/places/${v.userPlace.id}` }
    entry.count++
    placeVisits.set(key, entry)
  }
  const topPlaces = Array.from(placeVisits.values()).sort((a, b) => b.count - a.count).slice(0, 3)

  // Top dish by name this year.
  const dishCounts = new Map<string, number>()
  for (const m of meals) {
    const key = m.name.trim()
    dishCounts.set(key, (dishCounts.get(key) ?? 0) + 1)
  }
  const topDishes = Array.from(dishCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)

  // Cuisine mix this year (by visit).
  const cuisineCounts = new Map<string, { emoji: string; label: string; count: number }>()
  for (const v of visits) {
    const chip = cuisineChip(v.userPlace.place.cuisine)
    if (!chip) continue
    const entry = cuisineCounts.get(chip.label) ?? { ...chip, count: 0 }
    entry.count++
    cuisineCounts.set(chip.label, entry)
  }
  const topCuisines = Array.from(cuisineCounts.values()).sort((a, b) => b.count - a.count).slice(0, 3)

  const ratings = visits.map((v) => v.rating).filter((r): r is number => r != null)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  const distinctPlaces = placeVisits.size

  const shareText = [
    `My ${year} in food so far 🍴`,
    `${visits.length} visits · ${distinctPlaces} places · ${meals.length} dishes logged`,
    topPlaces[0] ? `Top spot: ${topPlaces[0].name} (${topPlaces[0].count}x)` : null,
    topDishes[0] ? `On repeat: ${topDishes[0][0]}` : null,
    'Tracked with Fork’d — getforkdapp.com',
  ].filter(Boolean).join('\n')

  const stats = [
    { label: 'Visits', value: visits.length, icon: CalendarCheck },
    { label: 'Places', value: distinctPlaces, icon: MapPin },
    { label: 'Dishes logged', value: meals.length, icon: UtensilsCrossed },
    { label: 'Photos', value: photoCount, icon: Camera },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 bg-white/70 border border-stone-200/60 rounded-full pl-2 pr-3 py-1.5 shadow-sm active:scale-95 transition mb-5">
        <ArrowLeft className="w-4 h-4" /> Profile
      </Link>

      {/* Hero */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 mb-6">
        <p className="text-orange-100 text-sm font-medium">{firstName}&apos;s</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{year} in Food</h1>
        <p className="text-orange-100 text-sm mt-1">
          {visits.length === 0 ? 'The year is young — go eat something!' : `${visits.length} visit${visits.length !== 1 ? 's' : ''} and counting…`}
        </p>
      </div>

      {visits.length > 0 ? (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="card p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums text-stone-900 leading-none">{value}</p>
                  <p className="text-xs font-medium text-stone-500 mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top places */}
          {topPlaces.length > 0 && (
            <div className="card p-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" /> Most visited this year
              </p>
              <div className="space-y-2.5">
                {topPlaces.map((p, i) => (
                  <Link key={p.href} href={p.href} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center" aria-hidden>{['🥇', '🥈', '🥉'][i]}</span>
                    <span className="font-semibold text-stone-800 flex-1 truncate">{p.name}</span>
                    <span className="text-sm text-orange-600 font-semibold tabular-nums">{p.count}x</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top dishes */}
          {topDishes.length > 0 && (
            <div className="card p-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">On repeat</p>
              <div className="space-y-2">
                {topDishes.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-stone-700 text-sm truncate">{name}</span>
                    <span className="text-xs text-stone-400 tabular-nums flex-shrink-0">{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flavor profile */}
          {(topCuisines.length > 0 || avgRating != null) && (
            <div className="card p-4 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">Flavor profile</p>
              {topCuisines.length > 0 && (
                <p className="text-sm text-stone-700 mb-2">
                  {topCuisines.map((c) => `${c.emoji} ${c.label}`).join(' · ')}
                </p>
              )}
              {avgRating != null && (
                <p className="text-sm text-stone-500 flex items-center gap-1">
                  Average visit rating <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                  <span className="font-semibold text-stone-700">{avgRating.toFixed(1)}</span>
                </p>
              )}
            </div>
          )}

          <ShareRecapButton text={shareText} />
        </>
      ) : (
        <div className="card p-6 text-center text-stone-400">
          <p className="text-sm">Log some visits and this page turns into your year-end recap.</p>
        </div>
      )}
    </div>
  )
}
