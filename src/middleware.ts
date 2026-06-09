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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-|icons).*)'],
}
