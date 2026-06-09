'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarClock, Plus, ChevronUp, X, Loader2 } from 'lucide-react'
import type { PlaceSpecial } from '@/types/models'

const SPECIAL_TYPES = [
  { value: 'happy_hour', label: 'Happy Hour', emoji: '🍺' },
  { value: 'weekly_special', label: 'Weekly Special', emoji: '⭐' },
  { value: 'trivia', label: 'Trivia', emoji: '🎉' },
  { value: 'live_music', label: 'Live Music', emoji: '🎵' },
  { value: 'brunch', label: 'Brunch', emoji: '🍳' },
  { value: 'other', label: 'Other', emoji: '📌' },
] as const

// Day picker order (Mon-first) mapped to JS day numbers (0=Sun…6=Sat).
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function emojiFor(type: string) {
  return SPECIAL_TYPES.find((t) => t.value === type)?.emoji ?? '📌'
}

// "5:00 PM" from "17:00".
function fmtTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

function whenLabel(s: PlaceSpecial): string {
  const day = s.dayOfWeek == null ? 'Varies' : DAY_FULL[s.dayOfWeek]
  const time = s.startTime ? `${fmtTime(s.startTime)}${s.endTime ? ` – ${fmtTime(s.endTime)}` : ''}` : ''
  return [day, time].filter(Boolean).join(' · ')
}

const EMPTY_FORM = {
  type: 'happy_hour' as string,
  title: '',
  dayOfWeek: null as number | null,
  startTime: '',
  endTime: '',
  description: '',
}

export default function PlaceSpecials({ userPlaceId, initial }: { userPlaceId: string; initial: PlaceSpecial[] }) {
  const [list, setList] = useState<PlaceSpecial[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!form.title.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/places/${userPlaceId}/specials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          description: form.description.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      const created: PlaceSpecial = await res.json()
      setList((prev) => [...prev, created])
      setForm(EMPTY_FORM)
      setShowForm(false)
      toast.success('Special added')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    const prev = list
    setList((l) => l.filter((s) => s.id !== id)) // optimistic
    try {
      const res = await fetch(`/api/places/${userPlaceId}/specials/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      setList(prev) // rollback
      toast.error('Could not delete. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <CalendarClock className="w-4 h-4" />
          <span>Specials ({list.length})</span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-orange-500 text-sm font-medium"
        >
          {showForm ? <ChevronUp className="w-5 h-5" /> : <><Plus className="w-4 h-4" /> Add Special</>}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 bg-orange-50 rounded-xl p-3">
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {SPECIAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title * (e.g. Half-price wings)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, dayOfWeek: d.value }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${form.dayOfWeek === d.value ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                {d.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, dayOfWeek: null }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${form.dayOfWeek === null ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500 bg-white'}`}
            >
              Varies
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 text-xs text-gray-500">
              Start
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
            <label className="flex-1 text-xs text-gray-500">
              End
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              disabled={saving}
              className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={add}
              disabled={saving || !form.title.trim()}
              className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-gray-400">No specials yet — tap Add Special to add one</p>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
              <span className="text-xl leading-none mt-0.5">{emojiFor(s.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-orange-500 font-medium">{whenLabel(s)}</p>
                {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
              </div>
              <button
                onClick={() => remove(s.id)}
                aria-label="Delete special"
                className="text-gray-300 hover:text-red-500 p-0.5 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
