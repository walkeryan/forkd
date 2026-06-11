// Server-side web push. VAPID keys live in per-deployment env.
import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@getforkdapp.com', pub, priv)
  configured = true
  return true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/** Send to every subscription a user has; prunes dead endpoints. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // 404/410 = subscription expired or revoked — clean it up.
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      } else {
        console.error('push send failed:', status, sub.endpoint.slice(0, 60))
      }
    }
  }
  return sent
}

/** Local date parts for the app's timezone (the server itself runs UTC). */
export function localToday(): { dayOfWeek: number; month: number; date: number; year: number } {
  const tz = process.env.APP_TZ ?? 'America/New_York'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    dayOfWeek: weekdays.indexOf(get('weekday')),
    month: Number(get('month')) - 1,
    date: Number(get('day')),
    year: Number(get('year')),
  }
}
