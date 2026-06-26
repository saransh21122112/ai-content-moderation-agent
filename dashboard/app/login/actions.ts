'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginAction(_: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const expected = process.env.DASHBOARD_PASSWORD || 'sentinel123'
  const secret = process.env.DASHBOARD_SECRET || 'sentinel-dev-secret'

  if (password === expected) {
    const jar = await cookies()
    jar.set('sentinel_auth', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    })
    redirect('/')
  }

  return { error: 'Incorrect password' }
}

export async function logoutAction() {
  const jar = await cookies()
  jar.delete('sentinel_auth')
  redirect('/login')
}
