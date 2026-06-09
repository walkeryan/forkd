'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

export type SortKey = 'recent' | 'top' | 'visited' | 'name'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'top', label: 'Top Rated' },
  { key: 'visited', label: 'Most Visited' },
  { key: 'name', label: 'A–Z' },
]

export default function PlacesFilters({ q, sort, price }: { q: string; sort: SortKey; price: number | null }) {
  const router = useRouter()
  const [text, setText] = useState(q)

  // Keep local input in sync if the URL changes from elsewhere (e.g. back nav).
  useEffect(() => setText(q), [q])

  function push(next: { q?: string; sort?: SortKey; price?: number | null }) {
    const params = new URLSearchParams()
    const nextQ = next.q !== undefined ? next.q : text
    const nextSort = next.sort !== undefined ? next.sort : sort
    const nextPrice = next.price !== undefined ? next.price : price
    if (nextQ.trim()) params.set('q', nextQ.trim())
    if (nextSort !== 'recent') params.set('sort', nextSort)
    if (nextPrice) params.set('price', String(nextPrice))
    const qs = params.toString()
    router.push(qs ? `/places?${qs}` : '/places')
  }

  // Debounce the free-text search.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  function onSearch(value: string) {
    setText(value)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => push({ q: value }), 300)
  }

  return (
    <div className="space-y-3 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={text}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search your places…"
          className="w-full border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {text && (
          <button onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => push({ sort: s.key })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              sort === s.key ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500 bg-white'
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="flex-shrink-0 w-px bg-gray-200 mx-1" />
        {[1, 2, 3, 4].map((p) => (
          <button
            key={p}
            onClick={() => push({ price: price === p ? null : p })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              price === p ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500 bg-white'
            }`}
          >
            {'$'.repeat(p)}
          </button>
        ))}
      </div>
    </div>
  )
}
