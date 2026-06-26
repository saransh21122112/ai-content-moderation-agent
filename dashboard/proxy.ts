import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login page and Next.js internals through
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  const token = request.cookies.get('sentinel_auth')?.value
  const secret = process.env.DASHBOARD_SECRET || 'sentinel-dev-secret'

  if (!token || token !== secret) {
    const loginUrl = new URL('/dashboard/login', request.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
