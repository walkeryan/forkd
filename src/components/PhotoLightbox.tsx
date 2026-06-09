'use client'
import { useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface LightboxPhoto {
  id: string
  caption?: string | null
}

export default function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: LightboxPhoto[]
  index: number | null
  onClose: () => void
  onNavigate: (next: number) => void
}) {
  const touchStartX = useRef<number | null>(null)

  const open = index != null && index >= 0 && index < photos.length

  // Keyboard navigation (desktop / accessibility).
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && index! < photos.length - 1) onNavigate(index! + 1)
      else if (e.key === 'ArrowLeft' && index! > 0) onNavigate(index! - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, photos.length, onClose, onNavigate])

  if (!open) return null
  const current = photos[index!]

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0 && index! < photos.length - 1) onNavigate(index! + 1)
      else if (dx > 0 && index! > 0) onNavigate(index! - 1)
    }
    touchStartX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      onClick={onClose}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="Close"
        className="absolute top-4 right-4 text-white/80 p-2 z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <span className="absolute top-5 left-4 text-white/60 text-sm z-10">
        {index! + 1} / {photos.length}
      </span>

      {index! > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index! - 1) }}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 p-2 z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {index! < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index! + 1) }}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 p-2 z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/photos/${current.id}`}
        alt={current.caption ?? ''}
        className="max-h-[90vh] max-w-[92vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
