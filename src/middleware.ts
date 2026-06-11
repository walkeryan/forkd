import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

// Use the lightweight, adapter-free config so this module is safe to load in
// the Next.js Edge Runtime (no Prisma, no native binaries, no setImmediate).
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const isPublic =
    pathname.startsWith('/signin') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/l/') || // public shared lists
    pathname.startsWith('/api/cron') // protected by CRON_SECRET, not a session

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }
  return NextResponse.next()
})

export const config = {
  // Exclude Next internals, the manifest, the service worker, and any static
  // asset with a file extension (favicons, the logo, app icons, images) so
  // unauthenticated requests for them aren't redirected to /signin.
  matcher: ['/((?!_next/static|_next/image|manifest.json|sw.js|.*\\.(?:png|svg|ico|jpg|jpeg|webp|gif)).*)'],
}
