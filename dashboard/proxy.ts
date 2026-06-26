import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'sentinel-jwt-dev-secret-change-in-prod'
)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('sentinel_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/dashboard/login', request.nextUrl.origin))
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/dashboard/login', request.nextUrl.origin))
    res.cookies.delete('sentinel_token')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
