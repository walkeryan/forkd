import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Users, MapPin, CalendarCheck, UtensilsCrossed, Camera, Bookmark, CalendarClock, Shield, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Admin' }

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminPage() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) notFound()

  const [userCount, placeCount, trackedCount, visitCount, mealCount, photoCount, wishlistCount, specialCount, users, userPlaceCounts, topPlaces] =
    await Promise.all([
      prisma.user.count(),
      prisma.place.count(),
      prisma.userPlace.count(),
      prisma.visit.count(),
      prisma.meal.count(),
      prisma.photo.count(),
      prisma.wishlistItem.count(),
      prisma.placeSpecial.count(),
      prisma.user.findMany({
        include: { _count: { select: { userPlaces: true, photos: true, wishlist: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      // Visits/meals hang off UserPlace, so roll them up to users in JS.
      prisma.userPlace.findMany({
        select: { userId: true, lastVisited: true, _count: { select: { visits: true, meals: true } } },
      }),
      prisma.place.findMany({
        include: { _count: { select: { userPlaces: true } } },
        orderBy: { userPlaces: { _count: 'desc' } },
        take: 5,
      }),
    ])

  const perUser = new Map<string, { visits: number; meals: number; lastVisited: Date | null }>()
  for (const up of userPlaceCounts) {
    const agg = perUser.get(up.userId) ?? { visits: 0, meals: 0, lastVisited: null }
    agg.visits += up._count.visits
    agg.meals += up._count.meals
    if (up.lastVisited && (!agg.lastVisited || up.lastVisited > agg.lastVisited)) agg.lastVisited = up.lastVisited
    perUser.set(up.userId, agg)
  }

  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const newThisWeek = users.filter((u) => u.createdAt > weekAgo).length

  const totals = [
    { label: 'Users', value: userCount, icon: Users },
    { label: 'Tracked places', value: trackedCount, icon: MapPin },
    { label: 'Visits', value: visitCount, icon: CalendarCheck },
    { label: 'Meals', value: mealCount, icon: UtensilsCrossed },
    { label: 'Photos', value: photoCount, icon: Camera },
    { label: 'Wishlisted', value: wishlistCount, icon: Bookmark },
    { label: 'Specials', value: specialCount, icon: CalendarClock },
    { label: 'Unique places', value: placeCount, icon: TrendingUp },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 pt-7">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center"><Shield className="w-4 h-4" /></span>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Admin</h1>
      </div>
      <p className="text-sm text-stone-500 mb-6">
        {userCount} user{userCount !== 1 ? 's' : ''}{newThisWeek > 0 ? ` · ${newThisWeek} new this week` : ''}
      </p>

      {/* App totals */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {totals.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-stone-900 leading-none">{value}</p>
              <p className="text-xs font-medium text-stone-500 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-user breakdown */}
      <h2 className="text-lg font-bold tracking-tight text-stone-900 mb-3">Users</h2>
      <div className="space-y-3 mb-6">
        {users.map((u) => {
          const agg = perUser.get(u.id) ?? { visits: 0, meals: 0, lastVisited: null }
          return (
            <div key={u.id} className="card p-4">
              <div className="flex items-center gap-3">
                {u.image ? (
                  <Image src={u.image} alt="" width={40} height={40} className="rounded-full w-10 h-10" />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400"><Users className="w-5 h-5" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900 truncate">{u.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-stone-400 truncate">{u.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-stone-400">joined {fmtDate(u.createdAt)}</p>
                  {agg.lastVisited && <p className="text-[11px] text-stone-400">active {fmtDate(agg.lastVisited)}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-medium text-stone-600">
                <span className="bg-stone-100 rounded-full px-2 py-0.5">{u._count.userPlaces} places</span>
                <span className="bg-stone-100 rounded-full px-2 py-0.5">{agg.visits} visits</span>
                <span className="bg-stone-100 rounded-full px-2 py-0.5">{agg.meals} meals</span>
                <span className="bg-stone-100 rounded-full px-2 py-0.5">{u._count.photos} photos</span>
                <span className="bg-stone-100 rounded-full px-2 py-0.5">{u._count.wishlist} wishlisted</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Most-tracked places across all users */}
      {topPlaces.some((p) => p._count.userPlaces > 0) && (
        <>
          <h2 className="text-lg font-bold tracking-tight text-stone-900 mb-3">Top places</h2>
          <div className="card p-4 mb-8">
            <div className="space-y-2">
              {topPlaces.filter((p) => p._count.userPlaces > 0).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="font-medium text-stone-800 text-sm truncate">{p.name}</span>
                  <span className="text-sm text-orange-600 font-semibold flex-shrink-0">
                    {p._count.userPlaces} user{p._count.userPlaces !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
