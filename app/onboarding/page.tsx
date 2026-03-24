'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/signup?step=2')
      } else {
        router.replace('/signup')
      }
    })
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F,
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        color: 'rgba(5,14,36,0.4)',
        fontSize: 14,
      }}>
        <span style={{
          width: 24,
          height: 24,
          border: '2px solid rgba(5,14,36,0.15)',
          borderTopColor: '#2563EB',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        Redirecting...
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
      ` }} />
    </div>
  )
}
