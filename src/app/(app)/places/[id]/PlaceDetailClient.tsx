'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StarRating from '@/components/StarRating'
import { MapPin, Plus, Calendar, UtensilsCrossed, Camera, Star, ChevronUp, MoreVertical, Trash2, Loader2 } from 'lucide-react'

export default function PlaceDetailClient({ userPlace }: { userPlace: any }) {
  const router = useRouter()
  const { place, meals, visits, photos } = userPlace
  const [rating, setRating] = useState<number | null>(userPlace.rating)
  const [priceRange, setPriceRange] = useState<number | null>(userPlace.priceRange)
  const [notes, setNotes] = useState(userPlace.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showMealForm, setShowMealForm] = useState(false)
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [mealName, setMealName] = useState('')
  const [mealNotes, setMealNotes] = useState('')
  const [mealFav, setMealFav] = useState(false)
  const [visitNotes, setVisitNotes] = useState('')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function removePlace() {
    setDeleting(true)
    const res = await fetch(`/api/places/${userPlace.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setDeleting(false)
      setConfirmDelete(false)
      alert('Could not remove this place. Please try again.')
      return
    }
    router.push('/places')
    router.refresh()
  }

  async function saveRating(newRating: number) {
    setRating(newRating)
    await fetch(`/api/places/${userPlace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: newRating }),
    })
    router.refresh()
  }

  async function saveDetails() {
    setSaving(true)
    await fetch(`/api/places/${userPlace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, priceRange }),
    })
    setSaving(false)
    router.refresh()
  }

  async function addMeal() {
    if (!mealName.trim()) return
    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPlaceId: userPlace.id, name: mealName, description: mealNotes, isFavorite: mealFav }),
    })
    setMealName(''); setMealNotes(''); setMealFav(false); setShowMealForm(false)
    router.refresh()
  }

  async function logVisit() {
    await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPlaceId: userPlace.id, notes: visitNotes, visitedAt: visitDate }),
    })
    setVisitNotes(''); setShowVisitForm(false)
    router.refresh()
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const form = new FormData()
    form.append('file', file)
    form.append('userPlaceId', userPlace.id)
    await fetch('/api/photos', { method: 'POST', body: form })
    setUploadingPhoto(false)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
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
              <div key={meal.id} className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{meal.name}</p>
                  {meal.description && <p className="text-xs text-gray-400">{meal.description}</p>}
                </div>
                {meal.isFavorite && <Star className="w-4 h-4 fill-orange-400 text-orange-400 flex-shrink-0 mt-0.5" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visits card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            <span>Visits ({userPlace.visitCount})</span>
          </div>
          <button onClick={() => setShowVisitForm(v => !v)} className="text-orange-500">
            {showVisitForm ? <ChevronUp className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
        {showVisitForm && (
          <div className="mb-3 space-y-2 bg-orange-50 rounded-xl p-3">
            <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <textarea value={visitNotes} onChange={e => setVisitNotes(e.target.value)} placeholder="How was it? (optional)"
              rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <button onClick={logVisit} className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium">Log Visit</button>
          </div>
        )}
        {visits.length === 0 ? (
          <p className="text-sm text-gray-400">No visits logged — tap + to log one</p>
        ) : (
          <div className="space-y-2">
            {visits.slice(0, 5).map((v: any) => (
              <div key={v.id} className="text-sm">
                <p className="text-gray-700 font-medium">{new Date(v.visitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                {v.notes && <p className="text-gray-400 text-xs">{v.notes}</p>}
              </div>
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
            {photos.map((photo: any) => (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={`/api/photos/${photo.id}`} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
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
    </div>
  )
}
