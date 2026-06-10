'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Camera, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
import StarRating from '@/components/StarRating'
import { getMenuSuggestions, searchDishes } from '@/lib/menuData'

interface MealFormProps {
  userPlaceId: string
  placeName: string
  cuisine?: string | null
  /** Called after the meal (and any photos) save successfully. */
  onSaved?: () => void
  /** Optional secondary action rendered next to the submit button. */
  onCancel?: () => void
  cancelLabel?: string
  submitLabel?: string
  autoFocus?: boolean
}

// A single meal-logging form shared by the Add Place flow and the place detail
// page. It owns its own submission: it creates the meal, then uploads any
// selected photos linked to both the meal and the visit (userPlace).
export default function MealForm({
  userPlaceId,
  placeName,
  cuisine,
  onSaved,
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel = 'Add Meal',
  autoFocus = false,
}: MealFormProps) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [serviceRating, setServiceRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [serviceNotes, setServiceNotes] = useState('')
  const [managementNotes, setManagementNotes] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [moreOpen, setMoreOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Build (and clean up) object-URL previews for the selected photos.
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  const allSuggestions = useMemo(
    () => getMenuSuggestions(placeName, cuisine ?? ''),
    [placeName, cuisine],
  )
  const query = name.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (query.length < 1) return []
    // A place with a curated bank (chain menu or cuisine list) searches only
    // its own dishes — cross-chain items like "Chick-fil-A Chicken Sandwich"
    // are noise at McDonald's. The global all-banks search is purely the
    // fallback for places with no bank at all.
    if (allSuggestions.length > 0) {
      return allSuggestions.filter((d) => d.toLowerCase().includes(query)).slice(0, 8)
    }
    return searchDishes(query, 8)
  }, [allSuggestions, query])

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setPhotos((prev) => [...prev, ...Array.from(files)])
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function submit() {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPlaceId,
          name: name.trim(),
          rating,
          serviceRating,
          isFavorite,
          notes: notes.trim() || null,
          serviceNotes: serviceNotes.trim() || null,
          managementNotes: managementNotes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      const meal = await res.json()

      // Upload selected photos, linking each to both the meal and the visit.
      if (photos.length) {
        const results = await Promise.all(
          photos.map(async (file) => {
            try {
              const form = new FormData()
              form.append('file', file)
              form.append('userPlaceId', userPlaceId)
              form.append('mealId', meal.id)
              const r = await fetch('/api/photos', { method: 'POST', body: form })
              return r.ok
            } catch {
              return false
            }
          }),
        )
        const failed = results.filter((ok) => !ok).length
        if (failed > 0) toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to upload`)
      }

      toast.success('Meal added')
      // Reset for a possible next entry.
      setName('')
      setRating(null)
      setServiceRating(null)
      setNotes('')
      setServiceNotes('')
      setManagementNotes('')
      setIsFavorite(false)
      setPhotos([])
      setMoreOpen(false)
      onSaved?.()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Dish name with typeahead */}
      <div className="relative">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="What did you have? *"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-300 transition-shadow"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200/60 rounded-xl shadow-xl shadow-stone-950/10 max-h-52 overflow-y-auto">
            {filtered.map((dish) => (
              <button
                key={dish}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setName(dish)
                  setShowSuggestions(false)
                }}
                className="block w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-orange-50"
              >
                {dish}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Food rating */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500">Food</span>
        <StarRating value={rating} onChange={setRating} size="sm" />
      </div>

      {/* Service rating */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500">Service</span>
        <StarRating value={serviceRating} onChange={setServiceRating} size="sm" />
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {previews.map((url, i) => (
            <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Remove photo"
                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 active:bg-black/70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-stone-300 rounded-xl text-stone-400 hover:border-orange-300 hover:text-orange-500 active:bg-stone-50 transition-colors"
            aria-label="Add photo"
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px]">Photo</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />
        </div>
      </div>

      {/* Favorite */}
      <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
        <input
          type="checkbox"
          checked={isFavorite}
          onChange={(e) => setIsFavorite(e.target.checked)}
          className="accent-orange-500"
        />
        Mark as favorite
      </label>

      {/* Collapsible details */}
      <div className="border-t border-stone-200/60 pt-2">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium text-stone-500"
        >
          {moreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          More details
        </button>
        {moreOpen && (
          <div className="space-y-2 mt-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Meal notes — describe the dish, how it tasted"
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-300 transition-shadow"
            />
            <textarea
              value={serviceNotes}
              onChange={(e) => setServiceNotes(e.target.value)}
              placeholder="Service notes — wait staff, attentiveness, friendliness"
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-300 transition-shadow"
            />
            <textarea
              value={managementNotes}
              onChange={(e) => setManagementNotes(e.target.value)}
              placeholder="Atmosphere notes — management vibe, cleanliness, noise level"
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400/70 focus:border-orange-300 transition-shadow"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 border border-stone-200 text-stone-500 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !name.trim()}
          className="flex-1 bg-gradient-to-b from-orange-500 to-orange-600 text-white rounded-lg py-2 text-sm font-semibold shadow-sm shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
