'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Share2, Copy, Trash2, Loader2 } from 'lucide-react'

// Create/copy/revoke the user's public top-places link.
export default function ShareListCard({ initialSlug }: { initialSlug: string | null }) {
  const [slug, setSlug] = useState(initialSlug)
  const [busy, setBusy] = useState(false)

  const url = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/l/${slug}` : null

  async function create() {
    setBusy(true)
    try {
      const res = await fetch('/api/shared-list', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSlug(data.slug)
      await navigator.clipboard.writeText(`${window.location.origin}/l/${data.slug}`)
      toast.success('Link copied — share away!')
    } catch {
      toast.error('Could not create the link')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  async function revoke() {
    setBusy(true)
    try {
      const res = await fetch('/api/shared-list', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSlug(null)
      toast.success('Link revoked')
    } catch {
      toast.error('Could not revoke the link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <Share2 className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800">Share your top places</p>
          <p className="text-xs text-stone-500 truncate">
            {url ?? 'A public link to your top-rated spots'}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {slug ? (
            <>
              <button onClick={copy} aria-label="Copy link" className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-100 text-stone-600 active:scale-90 transition">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={revoke} disabled={busy} aria-label="Revoke link" className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-100 text-stone-400 hover:text-red-500 active:scale-90 transition disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <button
              onClick={create}
              disabled={busy}
              className="rounded-xl px-3 py-2 text-xs font-semibold bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create link'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
