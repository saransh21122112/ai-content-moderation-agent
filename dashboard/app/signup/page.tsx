'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction } from './actions'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, null)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050507',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            borderRadius: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f2', letterSpacing: '-0.5px', margin: 0 }}>
            Sentinel
          </h1>
          <p style={{ fontSize: 14, color: '#52525b', marginTop: 6 }}>Trust &amp; Safety Dashboard</p>
        </div>

        <div style={{
          background: '#0d0d10',
          border: '1px solid #1c1c24',
          borderRadius: 16,
          padding: '32px 28px',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f2', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Create account
          </h2>
          <p style={{ fontSize: 13, color: '#52525b', margin: '0 0 28px' }}>
            Join Sentinel to access moderation tools.
          </p>

          <form action={action}>
            <Field label="Email address" name="email" type="email" placeholder="you@company.com" />
            <Field label="Username" name="username" type="text" placeholder="john_doe" />
            <Field label="Password" name="password" type="password" placeholder="Min. 8 characters" />
            <Field label="Confirm password" name="confirm" type="password" placeholder="Repeat password" />

            {state?.error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 13, color: '#ef4444' }}>{state.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              style={{
                width: '100%',
                background: pending ? '#1d3461' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 600,
                cursor: pending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 20,
              }}
            >
              {pending ? (
                <>
                  <SpinIcon />
                  Creating account…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  Create account
                </>
              )}
            </button>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: '#52525b' }}>Already have an account? </span>
              <Link href="/dashboard/login" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, name, type, placeholder }: {
  label: string; name: string; type: string; placeholder: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#71717a', marginBottom: 7 }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        style={{
          width: '100%',
          background: '#08080b',
          border: '1px solid #1c1c24',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 14,
          color: '#f0f0f2',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = '#3b82f6' }}
        onBlur={e => { e.target.style.borderColor = '#1c1c24' }}
      />
    </div>
  )
}

function SpinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}
