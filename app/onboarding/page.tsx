'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'role' | 'profile'
type Role = 'WHOLESALER' | 'BUYER' | 'BOTH'

const roles: { value: Role; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'WHOLESALER',
    label: 'I find deals',
    desc: 'I wholesale properties and need buyers',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    value: 'BUYER',
    label: 'I buy deals',
    desc: 'I\'m a cash buyer or investor looking for properties',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    value: 'BOTH',
    label: 'Both',
    desc: 'I wholesale and invest',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          role,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-[9px] px-3.5 py-2.5 text-[0.9rem] text-gray-900 bg-white outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 font-[inherit] box-border"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf4ff] via-[#f5f8ff] to-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Image src="/Logo.png" alt="DealFlow AI" width={30} height={30} style={{ objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="font-extrabold text-[0.95rem] text-gray-900 tracking-tight">
            DealFlow AI
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.09)] border border-gray-100 px-10 py-11">

          {step === 'role' && (
            <>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 text-blue-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-[1.6rem] font-extrabold text-gray-900 tracking-[-0.03em] mb-1.5 leading-tight">
                What describes you?
              </h1>
              <p className="text-[0.88rem] text-gray-500 mb-7 leading-relaxed">
                We&apos;ll customize your dashboard based on how you use the platform.
              </p>

              <div className="flex flex-col gap-3">
                {roles.map(r => (
                  <button
                    key={r.value}
                    onClick={() => { setRole(r.value); setStep('profile') }}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 w-full bg-white font-[inherit]
                      ${role === r.value
                        ? 'border-blue-400 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-[#f0f6ff]'}
                    `}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${role === r.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {r.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-[0.9rem] text-gray-900">{r.label}</div>
                      <div className="text-[0.78rem] text-gray-500 mt-0.5">{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'profile' && (
            <>
              <button
                onClick={() => setStep('role')}
                className="flex items-center gap-1.5 text-[0.8rem] text-gray-500 mb-6 bg-none border-none cursor-pointer p-0 font-[inherit] hover:text-gray-800 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>

              <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-[1.6rem] font-extrabold text-gray-900 tracking-[-0.03em] mb-1.5 leading-tight">
                Almost there
              </h1>
              <p className="text-[0.88rem] text-gray-500 mb-7 leading-relaxed">
                Tell us a bit about yourself so buyers and sellers can reach you.
              </p>

              <form onSubmit={handleFinish} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.75rem] font-semibold text-gray-700 mb-1.5 tracking-[0.01em]">First name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-semibold text-gray-700 mb-1.5 tracking-[0.01em]">Last name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Smith"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.75rem] font-semibold text-gray-700 mb-1.5 tracking-[0.01em]">Phone (optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-[0.82rem] text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-none font-bold text-[0.9rem] text-white cursor-pointer transition-colors mt-1"
                  style={{
                    background: loading ? '#93c5fd' : '#2563eb',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="onboard-spinner" />
                      Setting up your account…
                    </>
                  ) : 'Enter dashboard →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .onboard-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
