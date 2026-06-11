import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// The VAPID public key isn't secret, but serving it at runtime (instead of a
// NEXT_PUBLIC_ build-time inline) keeps it out of the CI build args.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
  return NextResponse.json({ key })
}
