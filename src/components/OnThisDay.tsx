'use client'
import Link from 'next/link'
import { Star } from 'lucide-react'

export interface PastVisit {
  visitedAt: string // ISO
  placeName: string
  rating: number | null
  href: string
}

// Client-rendered so "this day" is the user's local calendar date.
export default function OnThisDay({ visits }: { visits: PastVisit[] }) {
  const now = new Date()
  const matches = visits
    .map((v) => ({ ...v, date: new Date(v.visitedAt) }))
    .filter(
      (v) =>
        v.date.getFullYear() < now.getFullYear() &&
        v.date.getMonth() === now.getMonth() &&
        v.date.getDate() === now.getDate(),
    )
    .slice(0, 2)

  if (matches.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold tracking-tight text-stone-900 mb-3">On this day 📅</h2>
      <div className="space-y-3">
        {matches.map((v) => {
          const years = now.getFullYear() - v.date.getFullYear()
          return (
            <Link
              key={`${v.href}-${v.visitedAt}`}
              href={v.href}
              className="card flex items-center gap-3 p-4 bg-gradient-to-br from-white to-amber-50/60 active:scale-[0.99] transition-all duration-150"
            >
              <span className="w-11 h-11 rounded-xl bg-amber-100/70 flex items-center justify-center text-xl shrink-0" aria-hidden>🕰️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-500">
                  {years} year{years !== 1 ? 's' : ''} ago today you were at
                </p>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-900 truncate">{v.placeName}</h3>
                  {v.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold shrink-0">
                      <Star className="w-3 h-3 fill-orange-500" />{v.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
