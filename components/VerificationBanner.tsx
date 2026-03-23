'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function VerificationBanner() {
  const [emailVerified, setEmailVerified] = useState(true)
  const [phoneVerified, setPhoneVerified] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmailVerified(!!user.email_confirmed_at)
      setPhoneVerified(!!user.user_metadata?.phone_verified)
    })
  }, [])

  if (dismissed || (emailVerified && phoneVerified)) return null

  return (
    <div className="mb-5 rounded-[10px] border px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: 'rgba(37,99,235,0.04)',
        borderColor: 'rgba(37,99,235,0.12)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(37,99,235,0.08)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>
        <div className="text-sm" style={{ color: '#0B1224' }}>
          <span className="font-medium">Complete your account setup: </span>
          <span style={{ color: 'rgba(5,14,36,0.6)' }}>
            {!emailVerified && !phoneVerified
              ? 'Verify your email and phone number to unlock all features.'
              : !emailVerified
              ? 'Verify your email address to unlock all features.'
              : 'Verify your phone number to unlock all features.'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!emailVerified && (
          <Link href="/verify-email"
            className="text-xs font-semibold px-3 py-1.5 rounded-[8px]"
            style={{ background: '#2563EB', color: '#fff', textDecoration: 'none' }}
          >
            Verify email
          </Link>
        )}
        {emailVerified && !phoneVerified && (
          <Link href="/verify-phone"
            className="text-xs font-semibold px-3 py-1.5 rounded-[8px]"
            style={{ background: '#2563EB', color: '#fff', textDecoration: 'none' }}
          >
            Verify phone
          </Link>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-[rgba(5,14,36,0.05)]"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(5,14,36,0.3)', display: 'flex' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
