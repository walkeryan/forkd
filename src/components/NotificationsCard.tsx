'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bell, BellOff, Loader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)))
}

type Status = 'unsupported' | 'denied' | 'off' | 'on' | 'loading'

// Push enable/disable. iOS requires the PWA to be installed to the Home
// Screen (16.4+) before web push works — surface that instead of failing.
export default function NotificationsCard() {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = reg ? await reg.pushManager.getSubscription() : null
      setStatus(sub ? 'on' : 'off')
    })
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const { key } = await (await fetch('/api/push/key')).json()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error()
      setStatus('on')
      toast.success("Notifications on — we'll nudge you about specials & streaks")
    } catch {
      toast.error('Could not enable notifications')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('off')
      toast.success('Notifications off')
    } catch {
      toast.error('Could not disable notifications')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${status === 'on' ? 'bg-orange-100/70 text-orange-600' : 'bg-stone-100 text-stone-400'}`}>
          {status === 'on' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800">Notifications</p>
          <p className="text-xs text-stone-500">
            {status === 'on'
              ? 'Specials tonight, memories & streak reminders'
              : status === 'denied'
                ? 'Blocked in browser settings — re-allow to enable'
                : status === 'unsupported'
                  ? 'On iPhone: Share → Add to Home Screen first, then enable here'
                  : 'Get nudged about specials, memories & streaks'}
          </p>
        </div>
        {(status === 'on' || status === 'off') && (
          <button
            onClick={status === 'on' ? disable : enable}
            disabled={busy}
            className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold active:scale-95 transition disabled:opacity-50 ${
              status === 'on'
                ? 'bg-white border border-stone-200 text-stone-600 shadow-sm'
                : 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20'
            }`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>
    </div>
  )
}
