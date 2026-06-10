'use client'
import { useMemo, useState } from 'react'
import { cuisineChip } from '@/lib/places'

interface PlaceAvatarProps {
  place: {
    id: string
    name: string
    website?: string | null
    imagePath?: string | null
    cuisine?: string | null
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { box: 'w-10 h-10 rounded-xl', emoji: 'text-lg', px: 64 },
  md: { box: 'w-12 h-12 rounded-xl', emoji: 'text-xl', px: 64 },
  lg: { box: 'w-16 h-16 rounded-2xl', emoji: 'text-3xl', px: 128 },
}

/** Extract a bare hostname from a stored website URL (may lack a protocol). */
function domainOf(website: string): string | null {
  try {
    return new URL(website.includes('://') ? website : `https://${website}`).hostname
  } catch {
    return null
  }
}

/**
 * Place avatar with a graceful fallback chain:
 *  1. brand logo (favicon service keyed off the place's website domain)
 *  2. cached Google Places photo
 *  3. cuisine emoji
 */
export default function PlaceAvatar({ place, size = 'md', className = '' }: PlaceAvatarProps) {
  const s = SIZES[size]

  const sources = useMemo(() => {
    const list: string[] = []
    const domain = place.website ? domainOf(place.website) : null
    if (domain) list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${s.px}`)
    if (place.imagePath) list.push(`/api/place-images/${place.id}`)
    return list
  }, [place.id, place.website, place.imagePath, s.px])

  const [srcIndex, setSrcIndex] = useState(0)

  if (srcIndex < sources.length) {
    return (
      <img
        src={sources[srcIndex]}
        alt={place.name}
        onError={() => setSrcIndex((i) => i + 1)}
        className={`${s.box} object-cover bg-stone-100 border border-stone-200/60 flex-shrink-0 ${className}`}
      />
    )
  }

  const chip = cuisineChip(place.cuisine)
  return (
    <div
      aria-hidden
      className={`${s.box} flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 border border-orange-100/60 flex-shrink-0 ${className}`}
    >
      <span className={s.emoji}>{chip?.emoji ?? '🍽️'}</span>
    </div>
  )
}
