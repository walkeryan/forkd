'use client'
import Link from 'next/link'

export interface TonightSpecial {
  id: string
  type: string
  title: string
  startTime: string | null
  endTime: string | null
  dayOfWeek: number | null
  placeName: string
  href: string
}

const TYPE_EMOJI: Record<string, string> = {
  happy_hour: '🍺',
  weekly_special: '⭐',
  trivia: '🎉',
  live_music: '🎵',
  brunch: '🍳',
  other: '📌',
}

function fmtTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t ?? ''
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

// Rendered client-side so "tonight" is the USER's day of week, not the
// server's (the container runs in UTC and would flip days at ~8pm Eastern).
export default function TonightSpecials({ specials }: { specials: TonightSpecial[] }) {
  const today = new Date().getDay()
  const tonight = specials
    .filter((s) => s.dayOfWeek === today)
    .sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99'))

  if (tonight.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold tracking-tight text-stone-900 mb-3">Tonight 🌙</h2>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
        {tonight.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="card flex-shrink-0 w-56 p-3 active:scale-[0.98] transition-all duration-150"
          >
            <div className="flex items-start gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-orange-100/60 flex items-center justify-center text-lg flex-shrink-0">
                {TYPE_EMOJI[s.type] ?? '📌'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 text-sm truncate">{s.title}</p>
                <p className="text-xs text-stone-500 truncate">{s.placeName}</p>
                {s.startTime && (
                  <p className="text-[11px] text-orange-600 font-medium mt-0.5">
                    {fmtTime(s.startTime)}{s.endTime ? ` – ${fmtTime(s.endTime)}` : ''}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
