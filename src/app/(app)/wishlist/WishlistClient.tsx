'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { MapPin, Check, Trash2, Loader2 } from 'lucide-react'
import PlaceAvatar from '@/components/PlaceAvatar'

export interface WishlistEntry {
  id: string
  placeId: string
  name: string
  city: string | null
  state: string | null
  notes: string | null
  website: string | null
  imagePath: string | null
  cuisine: string | null
}

export default function WishlistClient({ items }: { items: WishlistEntry[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function markVisited(id: string) {
    setBusyId(id)
    const res = await fetch(`/api/wishlist/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitedAt: new Date().toISOString() }),
    })
    if (!res.ok) {
      setBusyId(null)
      toast.error('Could not mark as visited. Please try again.')
      return
    }
    const data = await res.json()
    toast.success('Moved to your places')
    router.push(`/places/${data.userPlaceId}`)
    router.refresh()
  }

  async function remove(id: string) {
    setBusyId(id)
    const res = await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setBusyId(null)
      toast.error('Could not remove. Please try again.')
      return
    }
    toast.success('Removed from wishlist')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              <PlaceAvatar
                place={{ id: item.placeId, name: item.name, website: item.website, imagePath: item.imagePath, cuisine: item.cuisine }}
                size="md"
              />
              <div className="min-w-0">
              <h2 className="font-semibold text-stone-900">{item.name}</h2>
              {item.city && (
                <p className="flex items-center gap-1 text-sm text-stone-400 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  {item.city}{item.state ? `, ${item.state}` : ''}
                </p>
              )}
              {item.notes && <p className="text-xs text-stone-400 mt-1">{item.notes}</p>}
              </div>
            </div>
            <button
              onClick={() => remove(item.id)}
              disabled={busyId === item.id}
              aria-label="Remove from wishlist"
              className="text-stone-300 hover:text-red-500 p-1 flex-shrink-0 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => markVisited(item.id)}
            disabled={busyId === item.id}
            className="mt-3 w-full bg-gradient-to-b from-orange-500 to-orange-600 text-white rounded-xl py-2 text-sm font-semibold shadow-sm shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {busyId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Mark as Visited
          </button>
        </div>
      ))}
    </div>
  )
}
