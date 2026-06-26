import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const jar = await cookies()
  jar.delete('sentinel_auth')
  return NextResponse.json({ ok: true })
}
