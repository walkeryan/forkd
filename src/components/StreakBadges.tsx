'use client'
import { Flame } from 'lucide-react'
import { weekStreak, visitsThisWeek, computeBadges, type BadgeInput } from '@/lib/engagement'

interface StreakBadgesProps {
  visitDates: string[] // ISO
  stats: Omit<BadgeInput, 'visits'> & { visits: number }
}

// Client-rendered so week boundaries follow the user's timezone.
export default function StreakBadges({ visitDates, stats }: StreakBadgesProps) {
  const dates = visitDates.map((d) => new Date(d))
  const streak = weekStreak(dates)
  const thisWeek = visitsThisWeek(dates)
  const badges = computeBadges(stats)
  const earned = badges.filter((b) => b.earned)

  return (
    <>
      {/* Streak */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${streak > 0 ? 'bg-gradient-to-br from-orange-100 to-amber-100 text-orange-500' : 'bg-stone-100 text-stone-400'}`}>
          <Flame className={`w-5 h-5 ${streak > 0 ? 'fill-orange-400' : ''}`} />
        </span>
        <div>
          <p className="font-bold tracking-tight text-stone-900">
            {streak > 0 ? `${streak}-week streak` : 'No streak yet'}
          </p>
          <p className="text-xs text-stone-500">
            {thisWeek > 0
              ? `${thisWeek} visit${thisWeek !== 1 ? 's' : ''} this week — keep it going!`
              : streak > 0
                ? 'Log a visit this week to keep it alive'
                : 'Log a visit each week to start one'}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">
          Badges · {earned.length}/{badges.length}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {badges.map((b) => (
            <div key={b.id} className="flex flex-col items-center gap-1" title={`${b.name} — ${b.desc}`}>
              <span
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                  b.earned
                    ? 'bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200/60 shadow-sm'
                    : 'bg-stone-100 grayscale opacity-40'
                }`}
              >
                {b.emoji}
              </span>
              <span className={`text-[9px] font-medium text-center leading-tight ${b.earned ? 'text-stone-600' : 'text-stone-400'}`}>
                {b.earned ? b.name : `${b.progress}/${b.goal}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
