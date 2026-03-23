'use client'

import { useState, useCallback } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'

/* ── Tokens ─────────────────────────────────────────────── */
const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const NAVY_H = 'rgb(8, 18, 42)'
const BLUE = '#2563EB'
const CREAM = 'rgb(249, 247, 244)'
const BODY = 'rgba(5, 14, 36, 0.65)'
const BODY_FEAT = 'rgba(5, 14, 36, 0.7)'
const MUTED = 'rgba(5, 14, 36, 0.45)'
const BORDER = '#E5E7EB'
const BORDER_SOFT = 'rgba(5, 14, 36, 0.06)'
const ACCENT_BG = 'rgba(37, 99, 235, 0.06)'

/* ── Data ───────────────────────────────────────────────── */
const tiers = [
  {
    name: 'Starter',
    price: '$149',
    period: '/mo',
    tagline: 'For solo wholesalers getting started',
    highlight: false,
    cta: 'Start 7-day free trial',
    ctaHref: '/signup',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    features: [
      '50 contact reveals/mo',
      '50 AI call minutes/mo',
      '100 SMS messages/mo',
      '10 deal analyses/mo',
      '1 active market',
      'CRM: 500 contacts',
      'Basic marketplace access',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/mo',
    tagline: 'For active wholesalers scaling up',
    highlight: true,
    badge: 'Most popular',
    cta: 'Start 7-day free trial',
    ctaHref: '/signup',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    features: [
      '200 contact reveals/mo',
      '200 AI call minutes/mo',
      '500 SMS messages/mo',
      '50 deal analyses/mo',
      '3 active markets',
      'CRM: 3,000 contacts',
      '3 team members',
      'Full marketplace + SMS campaigns',
      'A/B testing + analytics',
      'Priority support',
    ],
  },
  {
    name: 'Business',
    price: '$499',
    period: '/mo',
    tagline: 'For large operations and teams',
    highlight: false,
    cta: 'Start 7-day free trial',
    ctaHref: '/signup',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
    features: [
      '500 contact reveals/mo',
      '400 AI call minutes/mo',
      '1,000 SMS messages/mo',
      'Unlimited deal analyses',
      'Unlimited markets',
      'Unlimited CRM contacts',
      'Unlimited team members',
      'White-label option',
      'Custom integrations + API access',
      'Dedicated account manager',
    ],
  },
]

const usagePricing = [
  {
    label: 'Extra Reveals',
    price: '$0.25–$0.40',
    unit: '/reveal (varies by plan)',
    note: 'Additional contact reveals beyond your plan allowance.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="4" /><path d="M10.3 15H7a4 4 0 00-4 4v2" /><circle cx="17" cy="17" r="3" /><path d="m21 21-1.9-1.9" />
      </svg>
    ),
  },
  {
    label: 'Extra AI Minutes',
    price: '$0.15–$0.25',
    unit: '/min (varies by plan)',
    note: 'Additional AI call minutes beyond your plan allowance.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
  {
    label: 'Extra SMS',
    price: '$0.03–$0.05',
    unit: '/message (varies by plan)',
    note: 'Additional SMS messages beyond your plan allowance.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
]

const freeMinutes = [
  { tier: 'Starter', mins: 50, calls: '~17 calls', pct: 12.5 },
  { tier: 'Pro', mins: 200, calls: '~67 calls', pct: 50 },
  { tier: 'Business', mins: 400, calls: '~133 calls', pct: 100 },
]

const compare: { feature: string; starter: boolean | string; pro: boolean | string; business: boolean | string }[] = [
  { feature: 'Contact reveals', starter: '50/mo', pro: '200/mo', business: '500/mo' },
  { feature: 'AI call minutes', starter: '50/mo', pro: '200/mo', business: '400/mo' },
  { feature: 'SMS messages', starter: '100/mo', pro: '500/mo', business: '1,000/mo' },
  { feature: 'Deal analyses', starter: '10/mo', pro: '50/mo', business: 'Unlimited' },
  { feature: 'AI buyer discovery', starter: true, pro: true, business: true },
  { feature: 'Smart deal matching', starter: true, pro: true, business: true },
  { feature: 'E-signature', starter: true, pro: true, business: true },
  { feature: 'SMS campaigns', starter: true, pro: true, business: true },
  { feature: 'Multiple markets', starter: false, pro: true, business: true },
  { feature: 'A/B testing', starter: false, pro: true, business: true },
  { feature: 'Conversation intelligence', starter: false, pro: true, business: true },
  { feature: 'Team accounts', starter: false, pro: '3 users', business: 'Unlimited' },
  { feature: 'White-label', starter: false, pro: false, business: true },
  { feature: 'API access', starter: false, pro: false, business: true },
  { feature: 'Dedicated account manager', starter: false, pro: false, business: true },
]

const faqs = [
  {
    q: 'What happens when I exceed my plan allowances?',
    a: 'Overages are billed per-unit at the end of each billing period. Rates vary by plan. For example, extra reveals are $0.40 on Starter, $0.30 on Pro, and $0.25 on Business. You can see your usage anytime in Settings.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! Every plan includes a 7-day free trial with full access. No credit card required to start.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle. No long-term contracts.',
  },
  {
    q: 'Do I need to sign a contract?',
    a: 'No. All plans are month-to-month. Cancel anytime with no penalties.',
  },
  {
    q: 'How do I get started?',
    a: 'Sign up, pick a plan, and start finding buyers in minutes. No long setup process.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards via Stripe. Enterprise customers can pay by invoice.',
  },
]

/* ── Icons ──────────────────────────────────────────────── */
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.18)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function FeatureCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUTED}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/* String value is "positive" if Unlimited, All 50, or a high number */
function isPositiveValue(val: string) {
  return /unlimited|all 50/i.test(val)
}

function CellContent({ val, isPro }: { val: boolean | string; isPro?: boolean }) {
  if (val === true) return <div style={{ display: 'flex', justifyContent: 'center' }}><Check /></div>
  if (val === false) return <div style={{ display: 'flex', justifyContent: 'center' }}><XMark /></div>
  if (isPro) return <span style={{ fontSize: '0.75rem', fontWeight: 500, color: BLUE, fontFamily: F }}>{val}</span>
  const positive = isPositiveValue(val)
  return <span style={{ fontSize: '0.75rem', fontWeight: 400, color: positive ? NAVY_H : MUTED, fontFamily: F }}>{val}</span>
}

/* ── FAQ Item ───────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: NAVY_H, fontFamily: F, lineHeight: 1.4 }}>{q}</span>
        <Chevron open={open} />
      </button>
      <div style={{
        maxHeight: open ? 200 : 0, overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.2s ease',
        opacity: open ? 1 : 0,
      }}>
        <p style={{ fontSize: 14, color: BODY, lineHeight: 1.7, paddingBottom: 20, fontFamily: F }}>{a}</p>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────── */
export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = useCallback(async (priceId: string | undefined) => {
    if (!priceId) return

    // Check if user is logged in
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/signup'
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    }
    setLoading(false)
  }, [])

  return (
    <>
      <Nav currentPage="pricing" />
      <main style={{ paddingTop: 62, background: CREAM }}>

        {/* ── Hero ────────────────────────────────────────── */}
        <div style={{ background: CREAM }}>
          <div className="pricing-hero reveal" style={{ maxWidth: 700, margin: '0 auto', padding: '80px 40px 64px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(1.7rem, 3.5vw, 2.4rem)', fontWeight: 400, letterSpacing: '-0.022em', color: NAVY_H, marginBottom: 14, lineHeight: 1.15 }}>
              Simple Pricing, Serious Results
            </h1>
            <p style={{ fontSize: '0.97rem', color: 'rgba(5, 14, 36, 0.6)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 28px', fontFamily: F }}>
              Replace PropStream, your dialer, your CRM, and your contract platform. All in one. Usage-based so you only pay for what you use.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '6px 16px', fontSize: '0.8rem', color: NAVY_H, fontWeight: 500, fontFamily: F }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: BLUE, display: 'inline-block' }} />
              Usage-based so you only pay for what you use
            </div>
          </div>
        </div>

        {/* ── Pricing Cards ──────────────────────────────── */}
        <div className="pricing-section reveal" style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 28, fontFamily: F, textAlign: 'center' }}>
            Plans
          </p>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'stretch' }}>
            {tiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  borderRadius: 16,
                  border: tier.highlight ? `2px solid ${BLUE}` : `1px solid ${BORDER}`,
                  padding: '36px 32px 28px',
                  background: tier.highlight
                    ? 'linear-gradient(180deg, rgba(37,99,235,0.03) 0%, rgba(37,99,235,0.01) 100%)'
                    : 'white',
                  position: 'relative',
                  boxShadow: tier.highlight
                    ? '0 8px 30px rgba(37,99,235,0.1)'
                    : '0 1px 3px rgba(5,14,36,0.04)',
                  transform: tier.highlight ? 'translateY(-6px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {tier.badge && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: BLUE, color: 'white', fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 14px',
                    borderRadius: 20, whiteSpace: 'nowrap', fontFamily: F,
                  }}>
                    {tier.badge}
                  </div>
                )}
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
                  color: tier.highlight ? BLUE : MUTED, marginBottom: 16, fontFamily: F, textAlign: 'center',
                }}>
                  {tier.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: F, fontSize: '2.5rem', fontWeight: 600, color: NAVY_H, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {tier.price}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 400, color: MUTED, fontFamily: F, marginLeft: 3 }}>{tier.period}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: BODY, marginBottom: 22, lineHeight: 1.5, fontFamily: F, textAlign: 'center' }}>{tier.tagline}</p>
                {tier.stripePriceId !== undefined ? (
                  <button
                    onClick={() => handleSubscribe(tier.stripePriceId)}
                    disabled={loading}
                    className={tier.highlight ? 'pricing-cta-pro' : 'pricing-cta-outline'}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 42, borderRadius: 10, width: '100%', cursor: loading ? 'wait' : 'pointer',
                      fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none', fontFamily: F,
                      background: tier.highlight ? BLUE : 'transparent',
                      color: tier.highlight ? 'white' : NAVY_H,
                      border: tier.highlight ? 'none' : `1px solid ${NAVY_H}`,
                      marginBottom: 22,
                      transition: 'all 0.2s ease',
                      boxShadow: tier.highlight ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? 'Loading...' : tier.cta}
                  </button>
                ) : (
                  <Link
                    href={tier.ctaHref}
                    className={tier.highlight ? 'pricing-cta-pro' : 'pricing-cta-outline'}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 42, borderRadius: 10,
                      fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none', fontFamily: F,
                      background: tier.highlight ? BLUE : 'transparent',
                      color: tier.highlight ? 'white' : NAVY_H,
                      border: tier.highlight ? 'none' : `1px solid ${NAVY_H}`,
                      marginBottom: 22,
                      transition: 'all 0.2s ease',
                      boxShadow: tier.highlight ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                    }}
                  >
                    {tier.cta}
                  </Link>
                )}
                <div style={{ height: 1, background: BORDER, marginBottom: 18 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0 }}>
                    {tier.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, lineHeight: 2 }}>
                        <div style={{ marginTop: 4, flexShrink: 0 }}>
                          <FeatureCheck />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 400, color: BODY, fontFamily: F }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Usage-Based Pricing ────────────────────────── */}
        <div className="pricing-section reveal" style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 40px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 14, fontFamily: F }}>
              Usage-based
            </p>
            <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.3rem, 2.5vw, 1.6rem)', fontWeight: 400, color: NAVY_H, marginBottom: 10, letterSpacing: '-0.022em' }}>
              Pay as You Grow
            </h2>
            <p style={{ fontSize: '0.92rem', color: BODY, lineHeight: 1.7, maxWidth: 480, margin: '0 auto', fontFamily: F }}>
              Free minutes included with every plan. Only pay for what you use beyond your limit.
            </p>
          </div>
          <div className="usage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {usagePricing.map((item) => (
              <div key={item.label} style={{
                background: 'white', borderRadius: 14, border: `1px solid ${BORDER}`,
                padding: 24, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 180,
                alignItems: 'center', textAlign: 'center',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: MUTED, marginBottom: 5, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 600, color: NAVY_H, fontFamily: F, letterSpacing: '-0.02em', lineHeight: 1 }}>{item.price}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: MUTED, fontFamily: F }}>{item.unit}</span>
                  </div>
                </div>
                <p style={{ fontSize: 12.5, fontWeight: 400, color: 'rgba(5,14,36,0.4)', lineHeight: 1.5, fontFamily: F }}>{item.note}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: MUTED, marginTop: 20, fontFamily: F }}>
            Email campaigns included free with all plans. Free AI minutes reset monthly.
          </p>
        </div>

        {/* ── Free Minutes Comparison ────────────────────── */}
        <div className="pricing-section reveal" style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 40px 0' }}>
          <div style={{
            background: 'white', borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: '24px 28px',
          }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.88rem', fontWeight: 500, color: NAVY_H, fontFamily: F }}>Free AI call minutes per plan</p>
              <p style={{ fontSize: '0.78rem', color: MUTED, fontFamily: F }}>Average AI call duration: 3 minutes</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {freeMinutes.map((fm) => (
                <div key={fm.tier} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: NAVY_H, fontFamily: F, width: 80, flexShrink: 0 }}>{fm.tier}</span>
                  <div style={{ flex: 1, height: 10, background: 'rgba(5,14,36,0.04)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fm.pct}%`, background: BLUE, borderRadius: 5, transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: NAVY_H, fontFamily: F, width: 70, textAlign: 'right', flexShrink: 0 }}>{fm.mins} min</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: MUTED, fontFamily: F, width: 80, flexShrink: 0 }}>{fm.calls}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Feature Comparison Table ───────────────────── */}
        <div className="pricing-section pricing-compare reveal" style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 40px 0' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 14, fontFamily: F, textAlign: 'center' }}>
            Compare plans
          </p>
          <h2 style={{ fontFamily: SERIF, fontSize: '1.35rem', fontWeight: 400, color: NAVY_H, marginBottom: 32, letterSpacing: '-0.022em', textAlign: 'center' }}>
            Full Feature Comparison
          </h2>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'rgb(245, 243, 240)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 18px', fontSize: '0.72rem', fontWeight: 600, color: MUTED, fontFamily: F, borderBottom: `1px solid ${BORDER}` }}>Feature</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED, fontFamily: F, borderBottom: `1px solid ${BORDER}` }}>Starter</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: BLUE, fontFamily: F, background: 'rgba(37,99,235,0.03)', borderBottom: `1px solid ${BORDER}` }}>Pro</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED, fontFamily: F, borderBottom: `1px solid ${BORDER}` }}>Business</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: i < compare.length - 1 ? `1px solid ${BORDER_SOFT}` : 'none' }}>
                    <td style={{ padding: '9px 18px', fontSize: '0.78rem', color: BODY, fontFamily: F, background: i % 2 === 1 ? 'rgba(5,14,36,0.015)' : 'white' }}>{row.feature}</td>
                    <td style={{ textAlign: 'center', padding: '9px 12px', verticalAlign: 'middle', background: i % 2 === 1 ? 'rgba(5,14,36,0.015)' : 'white' }}><CellContent val={row.starter} /></td>
                    <td style={{ textAlign: 'center', padding: '9px 12px', verticalAlign: 'middle', background: i % 2 === 1 ? 'rgba(37,99,235,0.04)' : 'rgba(37,99,235,0.03)' }}><CellContent val={row.pro} isPro /></td>
                    <td style={{ textAlign: 'center', padding: '9px 12px', verticalAlign: 'middle', background: i % 2 === 1 ? 'rgba(5,14,36,0.015)' : 'white' }}><CellContent val={row.business} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── How We Compare ─────────────────────────────── */}
        <div className="pricing-section reveal" style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 40px 0' }}>
          <div style={{ background: 'rgba(37,99,235,0.03)', borderLeft: `3px solid ${BLUE}`, borderRadius: '0 12px 12px 0', padding: '24px 28px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 500, color: NAVY_H, marginBottom: 5, fontFamily: F }}>How we compare</p>
              <p style={{ fontSize: '0.86rem', color: BODY, lineHeight: 1.7, maxWidth: 740, fontFamily: F }}>
                PropStream alone is $99 to $399/mo for data only. Add a dialer ($100 to $200/mo), a CRM ($50 to $100/mo), and a contract platform ($30 to $50/mo) and you are at $280 to $750/mo with no automation, no AI calling, and no deal matching. DealFlow AI replaces all of it starting at $149/mo and actually does the work for you.
              </p>
            </div>
          </div>
        </div>

        {/* ── FAQ ────────────────────────────────────────── */}
        <div className="pricing-section reveal" style={{ maxWidth: 720, margin: '0 auto', padding: '64px 40px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 14, fontFamily: F }}>
              FAQ
            </p>
            <h2 style={{ fontFamily: SERIF, fontSize: '1.35rem', fontWeight: 400, color: NAVY_H, letterSpacing: '-0.022em' }}>
              Frequently Asked Questions
            </h2>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ─────────────────────────────────── */}
        <div style={{ marginTop: 80 }}>
          <div
            style={{
              position: 'relative', padding: '72px 40px', background: NAVY, overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.03, pointerEvents: 'none' }}>
              <Image src="/Logo.png" alt="" width={240} height={240} style={{ objectFit: 'contain' }} />
            </div>
            <div className="reveal" style={{ position: 'relative', zIndex: 2, maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)', fontWeight: 400, letterSpacing: '-0.022em', color: 'white', lineHeight: 1.15, marginBottom: 14 }}>
                Ready to Close More Deals?
              </h2>
              <p style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px', fontFamily: F }}>
                Join thousands of wholesalers closing more deals with less work.
              </p>
              <a
                href="/signup"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: BLUE, color: 'white', fontFamily: F, fontWeight: 500,
                  fontSize: '0.88rem', padding: '12px 28px', borderRadius: 10,
                  border: 'none', textDecoration: 'none', cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
                }}
              >
                Get started free
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: 14, fontFamily: F }}>
                or <a href="/#cta" className="pricing-waitlist-link" style={{ color: 'rgba(255,255,255,0.5)' }}>join the waitlist</a> for early access
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                {['50 states', 'TCPA compliant', 'Cancel anytime'].map((badge) => (
                  <div key={badge} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.1)', borderRadius: 20,
                    padding: '5px 14px',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: F }}>{badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
      <Footer />
      <ScrollReveal />

      <style dangerouslySetInnerHTML={{ __html: `
        .pricing-cta-outline:hover {
          background: ${NAVY} !important;
          color: white !important;
        }
        .pricing-cta-pro:hover {
          opacity: 0.92;
        }
        .pricing-waitlist-link {
          text-decoration: none;
          transition: text-decoration-color 0.15s ease;
        }
        .pricing-waitlist-link:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        @media (max-width: 860px) {
          .pricing-hero { padding: 56px 20px 48px !important; }
          .pricing-section { padding-left: 20px !important; padding-right: 20px !important; }
          .pricing-compare { padding-top: 48px !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .usage-grid { grid-template-columns: 1fr 1fr !important; }
          .pricing-compare table { font-size: 0.82rem; }
          .pricing-compare td, .pricing-compare th { padding: 10px 12px !important; }
        }
        @media (max-width: 560px) {
          .usage-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </>
  )
}
