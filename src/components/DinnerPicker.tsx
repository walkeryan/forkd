'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Dices, X, ArrowRight, RotateCw } from 'lucide-react'
import PlaceAvatar from '@/components/PlaceAvatar'
import StarRating from '@/components/StarRating'
import { cuisineChip } from '@/lib/places'

export interface PickerCandidate {
  href: string
  name: string
  rating: number | null
  cuisine: string | null
  kind: 'visited' | 'wishlist'
  placeId: string
  website: string | null
  imagePath: string | null
}

type Mode = 'all' | 'new' | 'favorite'

const MODES: { key: Mode; label: string }[] = [
  { key: 'all', label: '🎲 Surprise me' },
  { key: 'new', label: '✨ Something new' },
  { key: 'favorite', label: '🧡 A favorite' },
]

function pool(candidates: PickerCandidate[], mode: Mode): PickerCandidate[] {
  if (mode === 'new') return candidates.filter((c) => c.kind === 'wishlist')
  if (mode === 'favorite') return candidates.filter((c) => c.kind === 'visited' && (c.rating ?? 0) >= 4)
  return candidates
}

/** Weighted pick — higher-rated favorites surface a bit more often. */
function pick(candidates: PickerCandidate[]): PickerCandidate {
  const weights = candidates.map((c) => (c.kind === 'wishlist' ? 4 : Math.max(1, c.rating ?? 3)))
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

export default function DinnerPicker({ candidates }: { candidates: PickerCandidate[] }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('all')
  const [rolling, setRolling] = useState(false)
  const [flickerName, setFlickerName] = useState<string | null>(null)
  const [result, setResult] = useState<PickerCandidate | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function spin(nextMode: Mode = mode) {
    const options = pool(candidates, nextMode)
    if (options.length === 0) {
      setResult(null)
      setFlickerName(null)
      return
    }
    timers.current.forEach(clearTimeout)
    timers.current = []
    setRolling(true)
    setResult(null)
    // Flicker through names, slowing down before the reveal.
    const steps = 12
    let delay = 0
    for (let i = 0; i < steps; i++) {
      delay += 50 + i * 18
      timers.current.push(setTimeout(() => setFlickerName(options[Math.floor(Math.random() * options.length)].name), delay))
    }
    timers.current.push(
      setTimeout(() => {
        setFlickerName(null)
        setResult(pick(options))
        setRolling(false)
      }, delay + 180),
    )
  }

  function openPicker() {
    setOpen(true)
    setMode('all')
    spin('all')
  }

  function switchMode(m: Mode) {
    setMode(m)
    spin(m)
  }

  const emptyPool = pool(candidates, mode).length === 0

  return (
    <>
      <button
        onClick={openPicker}
        className="w-full flex items-center justify-between gap-3 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white rounded-2xl p-4 shadow-lg shadow-orange-500/25 active:scale-[0.98] active:shadow-md transition-all mb-8"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Dices className="w-5 h-5" />
          </span>
          <span className="text-left">
            <span className="block font-bold tracking-tight">Where should we eat?</span>
            <span className="block text-xs text-orange-100">Let Fork&apos;d pick from your places</span>
          </span>
        </span>
        <ArrowRight className="w-5 h-5 flex-shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-stone-950/20 animate-rise">
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-stone-200 sm:hidden" />
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-200/60">
              <h2 className="text-lg font-bold tracking-tight text-stone-900">Where should we eat?</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 p-1" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Mode chips */}
              <div className="flex gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => switchMode(m.key)}
                    className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold border active:scale-95 transition ${mode === m.key ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-500 bg-white'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Result area */}
              <div className="min-h-[150px] flex items-center justify-center">
                {emptyPool ? (
                  <p className="text-sm text-stone-400 text-center px-6">
                    {mode === 'new'
                      ? 'Your wishlist is empty — add a place you want to try!'
                      : mode === 'favorite'
                        ? 'No 4★+ places yet — rate some favorites first.'
                        : 'Add some places first and I’ll pick for you.'}
                  </p>
                ) : rolling ? (
                  <p className="text-xl font-bold tracking-tight text-stone-400 animate-pulse text-center">
                    {flickerName ?? '…'}
                  </p>
                ) : result ? (
                  <div className="w-full card p-4 bg-gradient-to-br from-white to-orange-50/60 flex items-center gap-3">
                    <PlaceAvatar
                      place={{ id: result.placeId, name: result.name, website: result.website, imagePath: result.imagePath, cuisine: result.cuisine }}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold tracking-tight text-stone-900 text-lg leading-tight">{result.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {(() => {
                          const chip = cuisineChip(result.cuisine)
                          return chip ? (
                            <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 rounded-full px-2 py-0.5 text-xs">
                              <span>{chip.emoji}</span>{chip.label}
                            </span>
                          ) : null
                        })()}
                        {result.kind === 'wishlist' ? (
                          <span className="text-xs font-semibold text-teal-600">On your wishlist ✨</span>
                        ) : result.rating != null ? (
                          <StarRating value={result.rating} readonly size="sm" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => spin()}
                  disabled={rolling || emptyPool}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-stone-700 font-semibold rounded-2xl py-3 border border-stone-200 shadow-sm active:scale-[0.98] active:bg-stone-50 transition-all disabled:opacity-50"
                >
                  <RotateCw className={`w-4 h-4 ${rolling ? 'animate-spin' : ''}`} /> Spin again
                </button>
                {result && !rolling && (
                  <Link
                    href={result.href}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-b from-orange-500 to-orange-600 text-white font-semibold rounded-2xl py-3 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
                  >
                    Let&apos;s go <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
