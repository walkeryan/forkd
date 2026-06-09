import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/signin')
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth')

  if (!isLoggedIn && !isAuthPage && !isApiAuth) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }
  return NextResponse.next()
})

export const config = {
  // Exclude Next internals, the manifest, and any static asset with a file
  // extension (favicons, the logo, app icons, images) so unauthenticated
  // requests for them aren't redirected to /signin.
  matcher: ['/((?!_next/static|_next/image|manifest.json|.*\\.(?:png|svg|ico|jpg|jpeg|webp|gif)).*)'],
}
