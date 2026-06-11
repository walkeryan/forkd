import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, MapPin } from 'lucide-react'
import { cuisineChip } from '@/lib/places'
import type { Metadata } from 'next'

// Public, unauthenticated page — a user's shareable top-10. Anyone with the
// link can view; no session, no nav chrome, just the list and a Fork'd pitch.

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const list = await prisma.sharedList.findUnique({ where: { slug: params.slug }, include: { user: true } })
  if (!list || !list.isPublic) return { title: "Fork'd" }
  return {
    title: list.title,
    description: `${list.user.name?.split(' ')[0] ?? 'A Fork’d user'}'s favorite places, ranked on Fork'd.`,
  }
}

export default async function SharedListPage({ params }: { params: { slug: string } }) {
  const list = await prisma.sharedList.findUnique({
    where: { slug: params.slug },
    include: { user: true },
  })
  if (!list || !list.isPublic) notFound()

  const places = await prisma.userPlace.findMany({
    where: { userId: list.userId, status: 'visited', rating: { not: null } },
    include: { place: true },
    orderBy: { rating: { sort: 'desc', nulls: 'last' } },
    take: 10,
  })

  const firstName = list.user.name?.trim().split(/\s+/)[0] ?? 'Someone'

  return (
    <div className="min-h-screen bg-app">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-16">
        <header className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 flex items-center justify-center text-2xl">
            🍴
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">{list.title}</h1>
          <p className="text-sm text-stone-500 mt-1">{firstName}&apos;s favorites, ranked with Fork&apos;d</p>
        </header>

        {places.length === 0 ? (
          <p className="text-center text-stone-400 text-sm">Nothing rated yet — check back soon!</p>
        ) : (
          <div className="space-y-3">
            {places.map((up, i) => {
              const chip = cuisineChip(up.place.cuisine)
              return (
                <div key={up.id} className="card p-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600 font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-stone-900 truncate">{up.place.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-stone-400">
                      {up.place.city && (
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{up.place.city}</span>
                      )}
                      {chip && <span>{chip.emoji} {chip.label}</span>}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-orange-500 bg-amber-50 rounded-full px-2 py-0.5 flex-shrink-0">
                    <Star className="w-4 h-4 fill-orange-500" />
                    <span className="text-sm font-semibold">{up.rating!.toFixed(1)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <footer className="text-center mt-10">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 bg-gradient-to-b from-orange-500 to-orange-600 text-white font-semibold rounded-2xl px-6 py-3 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
          >
            Start your own food journal 🍴
          </Link>
          <p className="text-xs text-stone-400 mt-3">Made with Fork&apos;d — getforkdapp.com</p>
        </footer>
      </div>
    </div>
  )
}
