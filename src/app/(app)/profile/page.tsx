import { auth } from '@/auth'
import { signOut } from '@/auth'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin'
import StreakBadges from '@/components/StreakBadges'
import { cuisineChip } from '@/lib/places'
import NotificationsCard from '@/components/NotificationsCard'
import ShareListCard from '@/components/ShareListCard'
import { MapPin, CalendarCheck, Star, TrendingUp, Shield, ChevronRight } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function ProfilePage() {
  const session = await auth()
  const userId = session!.user!.id

  const [placeCount, visitCount, avgAgg, mostVisited, topRated, recentVisits, mealNames, photoCount, sharedList, cuisinePlaces] = await Promise.all([
    prisma.userPlace.count({ where: { userId, status: 'visited' } }),
    prisma.visit.count({ where: { userPlace: { userId } } }),
    prisma.userPlace.aggregate({ where: { userId, rating: { not: null } }, _avg: { rating: true } }),
    prisma.userPlace.findFirst({
      where: { userId, status: 'visited' },
      include: { place: true, _count: { select: { visits: true } } },
      orderBy: { visits: { _count: 'desc' } },
    }),
    prisma.userPlace.findMany({
      where: { userId, status: 'visited', rating: { not: null } },
      include: { place: true },
      orderBy: { rating: { sort: 'desc', nulls: 'last' } },
      take: 3,
    }),
    prisma.visit.findMany({
      where: { userPlace: { userId } },
      select: { visitedAt: true },
      orderBy: { visitedAt: 'desc' },
      take: 500,
    }),
    prisma.meal.findMany({
      where: { userPlace: { userId } },
      select: { name: true },
    }),
    prisma.photo.count({ where: { userId } }),
    prisma.sharedList.findFirst({ where: { userId }, select: { slug: true } }),
    prisma.userPlace.findMany({
      where: { userId, status: 'visited' },
      select: { place: { select: { cuisine: true } }, _count: { select: { visits: true } } },
    }),
  ])

  const avgRating = avgAgg._avg.rating

  // Bucket visits into the last 6 calendar months for a small bar chart.
  const now = new Date()
  const buckets: { label: string; key: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ label: MONTHS[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}`, count: 0 })
  }
  for (const v of recentVisits) {
    const d = new Date(v.visitedAt)
    const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (b) b.count++
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count))
  const hasStats = placeCount > 0

  // Top cuisines, weighted by visit count (a place with 10 visits says more
  // about taste than one drive-by).
  const cuisineWeights = new Map<string, { emoji: string; label: string; weight: number }>()
  for (const up of cuisinePlaces) {
    const chip = cuisineChip(up.place.cuisine)
    if (!chip) continue
    const key = chip.label
    const entry = cuisineWeights.get(key) ?? { emoji: chip.emoji, label: chip.label, weight: 0 }
    entry.weight += Math.max(1, up._count.visits)
    cuisineWeights.set(key, entry)
  }
  const topCuisines = Array.from(cuisineWeights.values()).sort((a, b) => b.weight - a.weight).slice(0, 5)
  const maxCuisine = Math.max(1, ...topCuisines.map((c) => c.weight))

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 mb-6">Profile</h1>

      <div className="rounded-2xl p-5 bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/20 flex items-center gap-4 mb-4 text-white">
        {session?.user?.image && (
          <Image src={session.user.image} alt="" width={56} height={56} className="rounded-full ring-2 ring-white/60 w-14 h-14" />
        )}
        <div>
          <p className="font-bold text-white">{session?.user?.name}</p>
          <p className="text-sm text-orange-100">{session?.user?.email}</p>
        </div>
      </div>

      {hasStats ? (
        <>
          <StreakBadges
            visitDates={recentVisits.map((v) => v.visitedAt.toISOString())}
            stats={{
              visits: visitCount,
              places: placeCount,
              meals: mealNames.length,
              photos: photoCount,
              mealNames: mealNames.map((m) => m.name),
            }}
          />

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card p-3 text-center">
              <span className="w-8 h-8 mx-auto rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center mb-1.5"><MapPin className="w-4 h-4" /></span>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-stone-900">{placeCount}</p>
              <p className="text-[11px] font-medium text-stone-500">Places</p>
            </div>
            <div className="card p-3 text-center">
              <span className="w-8 h-8 mx-auto rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center mb-1.5"><CalendarCheck className="w-4 h-4" /></span>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-stone-900">{visitCount}</p>
              <p className="text-[11px] font-medium text-stone-500">Visits</p>
            </div>
            <div className="card p-3 text-center">
              <span className="w-8 h-8 mx-auto rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center mb-1.5"><Star className="w-4 h-4" /></span>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-stone-900">{avgRating ? avgRating.toFixed(1) : '—'}</p>
              <p className="text-[11px] font-medium text-stone-500">Avg rating</p>
            </div>
          </div>

          <div className="card p-4 mb-4">
            <div className="flex items-center gap-2 font-semibold text-stone-800 mb-3">
              <span className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></span>
              Visits by month
            </div>
            <div className="flex items-end justify-between gap-2 h-24">
              {buckets.map((b, i) => (
                <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[10px] text-stone-400 mb-0.5">{b.count || ''}</span>
                  <div
                    className={`w-full bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-md ${i === buckets.length - 1 ? '' : 'opacity-60'}`}
                    style={{ height: `${(b.count / maxBucket) * 100}%`, minHeight: b.count ? '4px' : '0' }}
                  />
                  <span className="text-[10px] text-stone-400 mt-1">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {topCuisines.length > 0 && (
            <div className="card p-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">Your top cuisines</p>
              <div className="space-y-2">
                {topCuisines.map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className="w-7 text-lg text-center" aria-hidden>{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="font-medium text-stone-700 truncate">{c.label}</span>
                        <span className="text-xs text-stone-400 tabular-nums">{c.weight} visit{c.weight !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${(c.weight / maxCuisine) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mostVisited && mostVisited._count.visits > 0 && (
            <div className="card p-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1">Most visited</p>
              <Link href={`/places/${mostVisited.id}`} className="flex items-center justify-between">
                <span className="font-semibold text-stone-900">{mostVisited.place.name}</span>
                <span className="text-sm text-orange-500 font-medium">{mostVisited._count.visits} visits</span>
              </Link>
            </div>
          )}

          {topRated.length > 0 && (
            <div className="card p-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Top rated</p>
              <div className="space-y-2">
                {topRated.map((up) => (
                  <Link key={up.id} href={`/places/${up.id}`} className="flex items-center justify-between">
                    <span className="font-medium text-stone-800 text-sm">{up.place.name}</span>
                    <span className="flex items-center gap-0.5 text-orange-500 text-sm font-semibold">
                      <Star className="w-3.5 h-3.5 fill-orange-500" />{up.rating!.toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-6 text-center text-stone-400 mb-4">
          <p className="text-sm">Add some places and your stats will show up here.</p>
        </div>
      )}

      <Link href="/recap" className="card p-4 mb-4 flex items-center gap-3 active:scale-[0.99] transition-all duration-150">
        <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600 flex items-center justify-center text-lg" aria-hidden>🎉</span>
        <span className="flex-1">
          <span className="block font-semibold text-stone-800">Your {new Date().getFullYear()} in Food</span>
          <span className="block text-xs text-stone-500">Top spots, repeat dishes, flavor profile</span>
        </span>
        <ChevronRight className="w-4 h-4 text-stone-400" />
      </Link>

      <NotificationsCard />
      <ShareListCard initialSlug={sharedList?.slug ?? null} />

      {isAdmin(session?.user?.email) && (
        <Link href="/admin" className="card p-4 mb-4 flex items-center gap-3 active:scale-[0.99] transition-all duration-150">
          <span className="w-9 h-9 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center"><Shield className="w-4 h-4" /></span>
          <span className="font-semibold text-stone-800 flex-1">Admin dashboard</span>
          <ChevronRight className="w-4 h-4 text-stone-400" />
        </Link>
      )}

      <form action={async () => { 'use server'; await signOut({ redirectTo: '/signin' }) }}>
        <button type="submit" className="w-full bg-white border border-red-200 text-red-500 rounded-xl py-3 text-sm font-medium shadow-sm active:bg-red-50 transition mb-4">
          Sign Out
        </button>
      </form>
    </div>
  )
}
