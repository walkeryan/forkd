import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, CalendarCheck, Bookmark, Plus, Map, Clock, ChevronRight } from 'lucide-react'
import StarRating from '@/components/StarRating'
import EmptyState from '@/components/EmptyState'
import { cuisineChip } from '@/lib/places'

// Short, friendly relative date for the activity feed. Rendered on the server,
// so it uses the server clock — close enough for a dashboard banner.
function relativeDate(d: Date): string {
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function HomePage() {
  const session = await auth()
  const userId = session!.user!.id
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? 'there'

  const [placeCount, visitCount, wishlistCount, recentVisits, wishlist] = await Promise.all([
    prisma.userPlace.count({ where: { userId, status: 'visited' } }),
    prisma.visit.count({ where: { userPlace: { userId } } }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.visit.findMany({
      where: { userPlace: { userId } },
      include: { userPlace: { include: { place: true } } },
      orderBy: { visitedAt: 'desc' },
      take: 5,
    }),
    prisma.wishlistItem.findMany({
      where: { userId },
      include: { place: true },
      orderBy: { addedAt: 'desc' },
      take: 3,
    }),
  ])

  const stats = [
    { label: 'Places', value: placeCount, icon: MapPin, href: '/places' },
    { label: 'Visits', value: visitCount, icon: CalendarCheck, href: '/places' },
    { label: 'Wishlist', value: wishlistCount, icon: Bookmark, href: '/wishlist' },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 pt-7">
      {/* Branding + greeting */}
      <header className="mb-6">
        <Image src="/logo.svg" alt="Fork'd" width={130} height={45} priority className="h-11 w-auto" />
        <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-stone-900">Hey, {firstName}!</h1>
        <p className="text-sm text-stone-500 mt-0.5">Here&apos;s what you&apos;ve been tasting.</p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="card p-4 flex flex-col gap-2 active:scale-[0.98] hover:shadow-md transition-all duration-150"
          >
            <span className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-3xl font-extrabold tracking-tight tabular-nums text-stone-900 leading-none">{value}</span>
            <span className="text-xs font-medium text-stone-500">{label}</span>
          </Link>
        ))}
      </div>

      {/* Primary CTAs */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/places?add=true"
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-b from-orange-500 to-orange-600 text-white font-semibold rounded-2xl py-3.5 shadow-lg shadow-orange-500/25 active:scale-[0.98] active:shadow-md transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Place
        </Link>
        <Link
          href="/map"
          className="flex-1 flex items-center justify-center gap-2 bg-white text-stone-700 font-semibold rounded-2xl py-3.5 border border-stone-200 shadow-sm active:scale-[0.98] active:bg-stone-50 transition-all"
        >
          <Map className="w-5 h-5 text-orange-500" />
          View Map
        </Link>
      </div>

      {/* Recent activity */}
      <section className="mb-8">
        <h2 className="text-lg font-bold tracking-tight text-stone-900 mb-3">Recent Activity</h2>
        {recentVisits.length === 0 ? (
          <EmptyState icon={Clock} title="No visits yet" hint="Log a visit to a place to see it here." className="py-10" />
        ) : (
          <div className="space-y-3">
            {recentVisits.map((visit) => {
              const place = visit.userPlace.place
              const chip = cuisineChip(place.cuisine)
              const rating = visit.rating ?? visit.userPlace.rating
              return (
                <Link
                  key={visit.id}
                  href={`/places/${visit.userPlaceId}`}
                  className="card flex items-center gap-3 p-4 active:scale-[0.99] transition-all duration-150"
                >
                  <span className="w-11 h-11 rounded-xl bg-orange-100/60 flex items-center justify-center text-xl shrink-0" aria-hidden>{chip?.emoji ?? '🍽️'}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-stone-900 truncate">{place.name}</h3>
                    {rating ? (
                      <div className="mt-0.5">
                        <StarRating value={rating} readonly size="sm" />
                      </div>
                    ) : (
                      place.city && (
                        <p className="text-sm text-stone-400 truncate">
                          {place.city}{place.state ? `, ${place.state}` : ''}
                        </p>
                      )
                    )}
                  </div>
                  <span className="text-xs text-stone-400 shrink-0">{relativeDate(new Date(visit.visitedAt))}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Wishlist preview */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold tracking-tight text-stone-900">Your Wishlist</h2>
          {wishlistCount > 0 && (
            <Link href="/wishlist" className="text-sm font-semibold text-orange-600 flex items-center gap-0.5">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        {wishlist.length === 0 ? (
          <EmptyState icon={Bookmark} title="Nothing saved yet" hint="Add a place to your wishlist to plan your next meal." className="py-10" />
        ) : (
          <div className="space-y-3">
            {wishlist.map((item) => {
              const chip = cuisineChip(item.place.cuisine)
              return (
                <Link
                  key={item.id}
                  href="/wishlist"
                  className="card flex items-center gap-3 p-4 active:scale-[0.99] transition-all duration-150"
                >
                  <span className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-xl shrink-0" aria-hidden>{chip?.emoji ?? '🍽️'}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-stone-900 truncate">{item.place.name}</h3>
                    {item.place.city && (
                      <p className="text-sm text-stone-400 truncate">
                        {item.place.city}{item.place.state ? `, ${item.place.state}` : ''}
                      </p>
                    )}
                  </div>
                  <Bookmark className="w-5 h-5 text-teal-600 shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
