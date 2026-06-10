'use client'
import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number | null
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const sizes = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-9 h-9' }
  const sz = sizes[size]
  const display = hover ?? value ?? 0

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(null)}
          className={readonly ? 'cursor-default' : 'cursor-pointer active:scale-110 transition-transform'}
        >
          <Star
            className={`${sz} ${display >= n ? 'fill-orange-500 text-orange-500' : 'text-stone-300'} transition-colors`}
          />
        </button>
      ))}
    </div>
  )
}
