'use server'

import { cookies } from 'next/headers'

const API_BASE = process.env.API_URL ?? 'http://127.0.0.1:8000'

export async function signupAction(_: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) {
    return { error: 'Passwords do not match' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
      cache: 'no-store',
    })

    const data = await res.json()

    if (!res.ok) {
      return { error: data.detail ?? 'Sign-up failed' }
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
    return { success: true }
  } catch {
    return { error: 'Cannot reach server. Please try again.' }
  }
}
