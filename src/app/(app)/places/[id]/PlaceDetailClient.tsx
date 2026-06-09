'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import StarRating from '@/components/StarRating'
import PhotoLightbox from '@/components/PhotoLightbox'
import { cuisineChip } from '@/lib/places'
import { MapPin, Plus, Calendar, UtensilsCrossed, Camera, Star, ChevronUp, MoreVertical, Trash2, Loader2, Pencil, Check, X, ArrowLeft, Tag as TagIcon } from 'lucide-react'

export default function PlaceDetailClient({ userPlace, allTags = [] }: { userPlace: any; allTags?: { id: string; name: string }[] }) {
  const router = useRouter()
  const { place, meals, visits, photos, tags } = userPlace
  const [rating, setRating] = useState<number | null>(userPlace.rating)
  const [priceRange, setPriceRange] = useState<number | null>(userPlace.priceRange)
  const [notes, setNotes] = useState(userPlace.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showMealForm, setShowMealForm] = useState(false)
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [mealName, setMealName] = useState('')
  const [mealNotes, setMealNotes] = useState('')
  const [mealFav, setMealFav] = useState(false)
  const [mealRating, setMealRating] = useState<number | null>(null)
  const [visitNotes, setVisitNotes] = useState('')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [visitRating, setVisitRating] = useState<number | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Inline edit state for meals + visits (P0.5).
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMeal, setEditMeal] = useState<{ name: string; description: string; isFavorite: boolean; rating: number | null }>({ name: '', description: '', isFavorite: false, rating: null })
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [editVisit, setEditVisit] = useState<{ visitedAt: string; notes: string; rating: number | null }>({ visitedAt: '', notes: '', rating: null })

  // Centralized fetch + feedback: surfaces a toast on failure (and optionally
  // on success) and refreshes server data when the mutation lands.
  async function mutate(fn: () => Promise<Response>, okMsg?: string): Promise<boolean> {
    try {
      const res = await fn()
      if (!res.ok) throw new Error()
      if (okMsg) toast.success(okMsg)
      router.refresh()
      return true
    } catch {
      toast.error('Something went wrong. Please try again.')
      return false
    }
  }

  function startEditMeal(meal: any) {
    setEditingMealId(meal.id)
    setEditMeal({ name: meal.name, description: meal.description ?? '', isFavorite: meal.isFavorite, rating: meal.rating ?? null })
  }

  async function saveMealEdit(id: string) {
    if (!editMeal.name.trim()) return
    const ok = await mutate(() => fetch(`/api/meals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editMeal.name.trim(), description: editMeal.description, isFavorite: editMeal.isFavorite, rating: editMeal.rating }),
    }), 'Meal updated')
    if (ok) setEditingMealId(null)
  }

  async function deleteMeal(id: string) {
    const ok = await mutate(() => fetch(`/api/meals/${id}`, { method: 'DELETE' }), 'Meal deleted')
    if (ok && editingMealId === id) setEditingMealId(null)
  }

  function startEditVisit(v: any) {
    setEditingVisitId(v.id)
    setEditVisit({ visitedAt: new Date(v.visitedAt).toISOString().split('T')[0], notes: v.notes ?? '', rating: v.rating ?? null })
  }

  async function saveVisitEdit(id: string) {
    const ok = await mutate(() => fetch(`/api/visits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitedAt: editVisit.visitedAt, notes: editVisit.notes, rating: editVisit.rating }),
    }), 'Visit updated')
    if (ok) setEditingVisitId(null)
  }

  async function deleteVisit(id: string) {
    const ok = await mutate(() => fetch(`/api/visits/${id}`, { method: 'DELETE' }), 'Visit deleted')
    if (ok && editingVisitId === id) setEditingVisitId(null)
  }

  async function removePlace() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/places/${userPlace.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Place removed')
      router.push('/places')
      router.refresh()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
      toast.error('Could not remove this place. Please try again.')
    }
  }

  async function saveRating(newRating: number) {
    setRating(newRating)
    await mutate(() => fetch(`/api/places/${userPlace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: newRating }),
    }))
  }

  async function saveDetails() {
    setSaving(true)
    await mutate(() => fetch(`/api/places/${userPlace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, priceRange }),
    }), 'Notes saved')
    setSaving(false)
  }

  async function addMeal() {
    if (!mealName.trim()) return
    const ok = await mutate(() => fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPlaceId: userPlace.id, name: mealName, description: mealNotes, isFavorite: mealFav, rating: mealRating }),
    }), 'Meal added')
    if (ok) { setMealName(''); setMealNotes(''); setMealFav(false); setMealRating(null); setShowMealForm(false) }
  }

  async function logVisit() {
    const ok = await mutate(() => fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPlaceId: userPlace.id, notes: visitNotes, visitedAt: visitDate, rating: visitRating }),
    }), 'Visit logged')
    if (ok) { setVisitNotes(''); setVisitRating(null); setShowVisitForm(false) }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const form = new FormData()
    form.append('file', file)
    form.append('userPlaceId', userPlace.id)
    await mutate(() => fetch('/api/photos', { method: 'POST', body: form }), 'Photo added')
    setUploadingPhoto(false)
    e.target.value = ''
  }

  async function deletePhoto(id: string) {
    if (!confirm('Delete this photo?')) return
    await mutate(() => fetch(`/api/photos/${id}`, { method: 'DELETE' }), 'Photo deleted')
  }

  const [tagInput, setTagInput] = useState('')
  async function addTag(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setTagInput('')
    await mutate(() => fetch(`/api/places/${userPlace.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    }))
  }

  async function removeTag(tagId: string) {
    await mutate(() => fetch(`/api/places/${userPlace.id}/tags/${tagId}`, { method: 'DELETE' }))
  }

  // Suggest the user's other tags not already on this place.
  const attachedIds = new Set(tags.map((t: any) => t.tag.id))
  const suggestions = allTags.filter((t) => !attachedIds.has(t.id))

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      {/* Back navigation */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 -ml-1 active:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> My Places
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
          {place.city && (
            <div className="flex items-center gap-1 text-gray-400 mt-1 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{place.city}{place.state ? `, ${place.state}` : ''}</span>
            </div>
          )}
          {(() => {
            const chip = cuisineChip(place.cuisine)
            return chip ? (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs mt-2">
                <span>{chip.emoji}</span>{chip.label}
              </span>
            ) : null
          })()}
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Place options"
            className="text-gray-400 p-2 -mr-2 rounded-full active:bg-gray-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
                <button
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 active:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" /> Remove Place
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rating card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-2">Your Rating</p>
        <StarRating value={rating} onChange={saveRating} size="lg" />
        <div className="flex gap-2 mt-3">
          {[1,2,3,4].map(p => (
            <button key={p} onClick={() => setPriceRange(p)}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition ${priceRange === p ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500'}`}>
              {'$'.repeat(p)}
            </button>
          ))}
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes about this place..."
          rows={2} className="w-full mt-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <button onClick={saveDetails} disabled={saving}
          className="mt-2 w-full bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* Tags card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 font-medium text-gray-700 mb-3">
          <TagIcon className="w-4 h-4" />
          <span>Tags</span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((t: any) => (
              <span key={t.tag.id} className="flex items-center gap-1 bg-orange-50 text-orange-600 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium">
                {t.tag.name}
                <button onClick={() => removeTag(t.tag.id)} aria-label={`Remove ${t.tag.name}`} className="hover:bg-orange-100 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); addTag(tagInput) }} className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            list="tag-suggestions"
            placeholder="Add a tag…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <datalist id="tag-suggestions">
            {suggestions.map((t) => <option key={t.id} value={t.name} />)}
          </datalist>
          <button type="submit" disabled={!tagInput.trim()} className="bg-orange-500 text-white rounded-lg px-3 text-sm font-medium disabled:opacity-50">
            Add
          </button>
        </form>
      </div>

      {/* Meals card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <UtensilsCrossed className="w-4 h-4" />
            <span>Meals ({meals.length})</span>
          </div>
          <button onClick={() => setShowMealForm(v => !v)} className="text-orange-500">
            {showMealForm ? <ChevronUp className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
        {showMealForm && (
          <div className="mb-3 space-y-2 bg-orange-50 rounded-xl p-3">
            <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Meal name *"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <input value={mealNotes} onChange={e => setMealNotes(e.target.value)} placeholder="Description (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Rating</span>
              <StarRating value={mealRating} onChange={setMealRating} size="sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={mealFav} onChange={e => setMealFav(e.target.checked)} className="accent-orange-500" />
              Mark as favorite
            </label>
            <button onClick={addMeal} className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium">Add Meal</button>
          </div>
        )}
        {meals.length === 0 ? (
          <p className="text-sm text-gray-400">No meals added yet — tap + to add one</p>
        ) : (
          <div className="space-y-2">
            {meals.map((meal: any) => (
              editingMealId === meal.id ? (
                <div key={meal.id} className="space-y-2 bg-orange-50 rounded-xl p-3">
                  <input value={editMeal.name} onChange={e => setEditMeal(m => ({ ...m, name: e.target.value }))} placeholder="Meal name *"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <input value={editMeal.description} onChange={e => setEditMeal(m => ({ ...m, description: e.target.value }))} placeholder="Description (optional)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Rating</span>
                    <StarRating value={editMeal.rating} onChange={r => setEditMeal(m => ({ ...m, rating: r }))} size="sm" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={editMeal.isFavorite} onChange={e => setEditMeal(m => ({ ...m, isFavorite: e.target.checked }))} className="accent-orange-500" />
                    Mark as favorite
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingMealId(null)} className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2 text-sm font-medium">Cancel</button>
                    <button onClick={() => saveMealEdit(meal.id)} className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Save</button>
                  </div>
                </div>
              ) : (
                <div key={meal.id} className="flex items-start justify-between gap-2 group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-800">{meal.name}</p>
                      {meal.isFavorite && <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400 flex-shrink-0" />}
                      {meal.rating != null && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                          <Star className="w-3 h-3 fill-orange-500" />{meal.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {meal.description && <p className="text-xs text-gray-400">{meal.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEditMeal(meal)} aria-label="Edit meal" className="text-gray-300 hover:text-gray-500 p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteMeal(meal.id)} aria-label="Delete meal" className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Visits card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            <span>Visits ({visits.length})</span>
          </div>
          <button onClick={() => setShowVisitForm(v => !v)} className="text-orange-500">
            {showVisitForm ? <ChevronUp className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
        {showVisitForm && (
          <div className="mb-3 space-y-2 bg-orange-50 rounded-xl p-3">
            <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Rating</span>
              <StarRating value={visitRating} onChange={setVisitRating} size="sm" />
            </div>
            <textarea value={visitNotes} onChange={e => setVisitNotes(e.target.value)} placeholder="How was it? (optional)"
              rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <button onClick={logVisit} className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium">Log Visit</button>
          </div>
        )}
        {visits.length === 0 ? (
          <p className="text-sm text-gray-400">No visits logged — tap + to log one</p>
        ) : (
          <div className="space-y-2">
            {visits.map((v: any) => (
              editingVisitId === v.id ? (
                <div key={v.id} className="space-y-2 bg-orange-50 rounded-xl p-3">
                  <input type="date" value={editVisit.visitedAt} onChange={e => setEditVisit(s => ({ ...s, visitedAt: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Rating</span>
                    <StarRating value={editVisit.rating} onChange={r => setEditVisit(s => ({ ...s, rating: r }))} size="sm" />
                  </div>
                  <textarea value={editVisit.notes} onChange={e => setEditVisit(s => ({ ...s, notes: e.target.value }))} placeholder="How was it? (optional)" rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingVisitId(null)} className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2 text-sm font-medium">Cancel</button>
                    <button onClick={() => saveVisitEdit(v.id)} className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Save</button>
                  </div>
                </div>
              ) : (
                <div key={v.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-2">
                      <p className="text-gray-700 font-medium">{new Date(v.visitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      {v.rating != null && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                          <Star className="w-3 h-3 fill-orange-500" />{v.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {v.notes && <p className="text-gray-400 text-xs">{v.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEditVisit(v)} aria-label="Edit visit" className="text-gray-300 hover:text-gray-500 p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteVisit(v.id)} aria-label="Delete visit" className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Photos card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <Camera className="w-4 h-4" />
            <span>Photos ({photos.length})</span>
          </div>
          <label className="cursor-pointer text-orange-500">
            {uploadingPhoto ? <span className="text-xs">Uploading...</span> : <Plus className="w-5 h-5" />}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadPhoto} />
          </label>
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-gray-400">No photos yet — tap + to add one</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo: any, i: number) => (
              <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <button type="button" onClick={() => setLightboxIndex(i)} className="block w-full h-full" aria-label="View photo">
                  <img src={`/api/photos/${photo.id}`} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => deletePhoto(photo.id)}
                  aria-label="Delete photo"
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 active:bg-black/70"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove-place confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg">Remove this place?</h3>
            <p className="text-sm text-gray-500 mt-1">
              Your meals, visits, and photos for {place.name} will also be deleted. This can&apos;t be undone.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={removePlace}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  )
}
