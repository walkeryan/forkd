import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

// Branded link-preview card for shared lists — what iMessage/WhatsApp/Slack
// render when someone pastes a /l/<slug> link.
export const runtime = 'nodejs'
export const alt = "A Fork'd top places list"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: { slug: string } }) {
  const list = await prisma.sharedList.findUnique({
    where: { slug: params.slug },
    include: { user: true },
  })

  const places = list?.isPublic
    ? await prisma.userPlace.findMany({
        where: { userId: list.userId, status: 'visited', rating: { not: null } },
        include: { place: true },
        orderBy: { rating: { sort: 'desc', nulls: 'last' } },
        take: 3,
      })
    : []

  const title = list?.isPublic ? list.title : "Fork'd"
  const medals = ['🥇', '🥈', '🥉']

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>🍴 Fork&apos;d</div>
          <div style={{ fontSize: 64, color: 'white', fontWeight: 800, marginTop: 8, lineHeight: 1.1 }}>{title}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {places.map((up, i) => (
            <div
              key={up.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                background: 'rgba(255,255,255,0.92)',
                borderRadius: 20,
                padding: '16px 28px',
              }}
            >
              <div style={{ fontSize: 36, display: 'flex' }}>{medals[i]}</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#1c1917', display: 'flex', flex: 1 }}>{up.place.name}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#ea580c', display: 'flex' }}>★ {up.rating!.toFixed(1)}</div>
            </div>
          ))}
          {places.length === 0 && (
            <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.9)', display: 'flex' }}>
              Track your favorite places &amp; meals
            </div>
          )}
        </div>

        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.85)', display: 'flex' }}>getforkdapp.com</div>
      </div>
    ),
    size,
  )
}
