import { auth } from '@/auth'
import { signOut } from '@/auth'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MapPin, CalendarCheck, Star, TrendingUp } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function ProfilePage() {
  const session = await auth()
  const userId = session!.user!.id

  const [placeCount, visitCount, avgAgg, mostVisited, topRated, recentVisits] = await Promise.all([
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-4">
        {session?.user?.image && (
          <Image src={session.user.image} alt="" width={48} height={48} className="rounded-full" />
        )}
        <div>
          <p className="font-semibold text-gray-900">{session?.user?.name}</p>
          <p className="text-sm text-gray-400">{session?.user?.email}</p>
        </div>
      </div>

      {hasStats ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
              <MapPin className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-xl font-bold text-gray-900">{placeCount}</p>
              <p className="text-[11px] text-gray-400">Places</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
              <CalendarCheck className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-xl font-bold text-gray-900">{visitCount}</p>
              <p className="text-[11px] text-gray-400">Visits</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
              <Star className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-xl font-bold text-gray-900">{avgRating ? avgRating.toFixed(1) : '—'}</p>
              <p className="text-[11px] text-gray-400">Avg rating</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center gap-2 font-medium text-gray-700 mb-3">
              <TrendingUp className="w-4 h-4" /> Visits by month
            </div>
            <div className="flex items-end justify-between gap-2 h-24">
              {buckets.map((b) => (
                <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[10px] text-gray-400 mb-0.5">{b.count || ''}</span>
                  <div
                    className="w-full bg-orange-400 rounded-t"
                    style={{ height: `${(b.count / maxBucket) * 100}%`, minHeight: b.count ? '4px' : '0' }}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {mostVisited && mostVisited._count.visits > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
              <p className="text-xs text-gray-400 mb-1">Most visited</p>
              <Link href={`/places/${mostVisited.id}`} className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{mostVisited.place.name}</span>
                <span className="text-sm text-orange-500 font-medium">{mostVisited._count.visits} visits</span>
              </Link>
            </div>
          )}

          {topRated.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
              <p className="text-xs text-gray-400 mb-2">Top rated</p>
              <div className="space-y-2">
                {topRated.map((up) => (
                  <Link key={up.id} href={`/places/${up.id}`} className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 text-sm">{up.place.name}</span>
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center text-gray-400 mb-4">
          <p className="text-sm">Add some places and your stats will show up here.</p>
        </div>
      )}

      <form action={async () => { 'use server'; await signOut({ redirectTo: '/signin' }) }}>
        <button type="submit" className="w-full border border-red-200 text-red-500 rounded-xl py-3 text-sm font-medium">
          Sign Out
        </button>
      </form>
    </div>
  )
}
