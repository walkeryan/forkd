import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser, localToday } from '@/lib/push'
import { weekStreak, visitsThisWeek } from '@/lib/engagement'

// Scheduled notification fan-out, hit by the NAS cron with the shared secret:
//   ?task=morning  — "on this day" memories            (run ~9am local)
//   ?task=evening  — tonight's specials at your places (run ~4:30pm local)
//   ?task=streak   — streak-at-risk nudge              (run Sat evening)
// Day/date math uses APP_TZ (the server clock is UTC).

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (!process.env.CRON_SECRET || searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const task = searchParams.get('task')

  // Only users with at least one push subscription matter.
  const subscribed = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })
  const userIds = subscribed.map((s) => s.userId)
  if (userIds.length === 0) return NextResponse.json({ task, sent: 0 })

  const today = localToday()
  let sent = 0

  if (task === 'evening') {
    for (const userId of userIds) {
      const specials = await prisma.placeSpecial.findMany({
        where: {
          isRecurring: true,
          dayOfWeek: today.dayOfWeek,
          place: { userPlaces: { some: { userId } } },
        },
        include: { place: true },
      })
      if (specials.length === 0) continue
      const first = specials[0]
      const more = specials.length - 1
      sent += await sendPushToUser(userId, {
        title: 'Tonight 🌙',
        body: `${first.title} at ${first.place.name}${more > 0 ? ` +${more} more` : ''}`,
        url: '/',
      })
    }
  } else if (task === 'morning') {
    for (const userId of userIds) {
      const visits = await prisma.visit.findMany({
        where: { userPlace: { userId } },
        select: { visitedAt: true, userPlace: { select: { id: true, place: { select: { name: true } } } } },
        take: 1000,
      })
      const match = visits.find((v) => {
        const d = v.visitedAt
        return d.getUTCFullYear() < today.year && d.getUTCMonth() === today.month && d.getUTCDate() === today.date
      })
      if (!match) continue
      const years = today.year - match.visitedAt.getUTCFullYear()
      sent += await sendPushToUser(userId, {
        title: 'On this day 📅',
        body: `${years} year${years !== 1 ? 's' : ''} ago you were at ${match.userPlace.place.name}. Remember?`,
        url: `/places/${match.userPlace.id}`,
      })
    }
  } else if (task === 'streak') {
    for (const userId of userIds) {
      const visits = await prisma.visit.findMany({
        where: { userPlace: { userId } },
        select: { visitedAt: true },
        orderBy: { visitedAt: 'desc' },
        take: 200,
      })
      const dates = visits.map((v) => v.visitedAt)
      const streak = weekStreak(dates)
      if (streak > 0 && visitsThisWeek(dates) === 0) {
        sent += await sendPushToUser(userId, {
          title: `Your ${streak}-week streak is at risk 🔥`,
          body: 'Log a visit before Monday to keep it alive!',
          url: '/places?add=true',
        })
      }
    }
  } else {
    return NextResponse.json({ error: 'Unknown task' }, { status: 400 })
  }

  return NextResponse.json({ task, users: userIds.length, sent })
}
