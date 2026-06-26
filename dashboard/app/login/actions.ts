'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_BASE = process.env.API_URL ?? 'http://127.0.0.1:8000'

export async function loginAction(_: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })

    const data = await res.json()

    if (!res.ok) {
      return { error: data.detail ?? 'Login failed' }
    }

    const jar = await cookies()
    jar.set('sentinel_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    jar.set('sentinel_refresh', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    })
  } catch {
    return { error: 'Cannot reach server. Please try again.' }
  }

  redirect('/')
}

export async function logoutAction() {
  const jar = await cookies()
  jar.delete('sentinel_token')
  jar.delete('sentinel_refresh')
  redirect('/login')
}
