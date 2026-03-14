import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing · DealFlow AI',
  description: 'Simple, transparent pricing for real estate wholesalers.',
}

const wholesalerTiers = [
  {
    name: 'Starter',
    price: '$199',
    period: '/mo',
    tagline: 'For wholesalers just getting started',
    highlight: false,
    features: [
      '1 active market',
      '500 AI calls/month',
      'Up to 5 active deals',
      'Buyer database up to 500',
      'Contract templates for top 5 states',
      '1 team user',
      'Basic deal map',
      'Standard deal quality protection',
      '$250/deal transaction fee',
      'Email support',
    ],
    cta: 'Join waitlist',
  },
  {
    name: 'Pro',
    price: '$349',
    period: '/mo',
    tagline: 'For active wholesalers scaling up',
    highlight: true,
    badge: 'Most popular',
    features: [
      '3 active markets',
      '2,000 AI calls/month',
      'Up to 20 active deals',
      'Buyer database up to 5,000',
      'Contract templates for all 50 states',
      '3 team users',
      'Full deal map + heat layers',
      'Standard deal quality protection',
      '$200/deal transaction fee',
      'Priority email support',
    ],
    cta: 'Join waitlist',
  },
  {
    name: 'Enterprise',
    price: '$499+',
    period: '/mo',
    tagline: 'For large operations and coaching programs',
    highlight: false,
    features: [
      'Unlimited markets',
      'Unlimited AI calls',
      'Unlimited active deals',
      'Unlimited buyer database',
      'All 50 states + custom templates',
      'Unlimited team users',
      'Full deal map + white-label',
      'Priority deal quality flagging',
      'Negotiated transaction fee',
      'Dedicated account manager',
    ],
    cta: 'Contact us',
    ctaHref: '/contact',
  },
]

const compare = [
  { feature: 'AI buyer discovery', starter: true, pro: true, enterprise: true },
  { feature: 'AI voice calling', starter: true, pro: true, enterprise: true },
  { feature: 'Deal analysis & ARV', starter: true, pro: true, enterprise: true },
  { feature: 'Smart deal matching', starter: true, pro: true, enterprise: true },
  { feature: 'Assignment contract generation', starter: true, pro: true, enterprise: true },
  { feature: 'E-signature collection', starter: true, pro: true, enterprise: true },
  { feature: 'Multiple markets', starter: false, pro: true, enterprise: true },
  { feature: 'Heat map layers', starter: false, pro: true, enterprise: true },
  { feature: 'Team accounts', starter: false, pro: true, enterprise: true },
  { feature: 'White-label', starter: false, pro: false, enterprise: true },
  { feature: 'Custom contract templates', starter: false, pro: false, enterprise: true },
  { feature: 'API access', starter: false, pro: false, enterprise: true },
]

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--blue-600)' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function X() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-300)' }}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function PricingPage() {
  return (
    <>
      <Nav currentPage="pricing" />
      <main style={{ paddingTop: 62, background: 'var(--white)' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(160deg, #eff6ff 0%, #f5f7ff 40%, #ffffff 70%)' }}>
          <div className="pricing-hero" style={{ maxWidth: 680, margin: '0 auto', padding: '80px 40px 64px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 22 }}>
              <span className="eyebrow-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              Early access pricing
            </div>
            <h1 style={{ fontFamily: 'inherit', fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--gray-900)', marginBottom: 16, lineHeight: 1.1 }}>
              Simple pricing, serious results
            </h1>
            <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 28px' }}>
              Replace PropStream, your dialer, your CRM, and your contract platform, all in one. Founding members lock in their rate forever.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '6px 16px', fontSize: '0.8rem', color: '#166534', fontWeight: 500 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              Founding member pricing locked in during beta
            </div>
          </div>
        </div>

        {/* Wholesaler tiers */}
        <div className="pricing-section" style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 40px 0' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 28 }}>
            Plans
          </p>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
            {wholesalerTiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  borderRadius: 14,
                  border: tier.highlight ? '1.5px solid var(--blue-600)' : '1px solid var(--gray-200)',
                  padding: '28px 24px',
                  background: tier.highlight ? 'linear-gradient(160deg, #eff6ff 0%, #fff 60%)' : 'var(--white)',
                  position: 'relative',
                  boxShadow: tier.highlight ? 'var(--shadow-lg)' : 'none',
                }}
              >
                {tier.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--blue-600)', color: 'white', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {tier.badge}
                  </div>
                )}
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tier.highlight ? 'var(--blue-600)' : 'var(--gray-400)', marginBottom: 16 }}>{tier.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                  <span style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--gray-900)', letterSpacing: '-0.03em', lineHeight: 1 }}>{tier.price}</span>
                  <span style={{ fontSize: '0.83rem', color: 'var(--gray-400)' }}>{tier.period}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 22, lineHeight: 1.5 }}>{tier.tagline}</p>
                <Link
                  href={tier.ctaHref ?? '/#cta'}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: '0.87rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: tier.highlight ? 'var(--blue-600)' : 'var(--gray-900)',
                    color: 'var(--white)',
                    border: 'none',
                    marginBottom: 22,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {tier.cta}
                </Link>
                <div style={{ height: 1, background: 'var(--gray-100)', marginBottom: 18 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tier.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <div style={{ marginTop: 1, flexShrink: 0 }}><Check /></div>
                      <span style={{ fontSize: '0.84rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="pricing-section pricing-compare" style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 40px 0' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
            Compare plans
          </p>
          <h2 style={{ fontFamily: 'inherit', fontSize: '1.5rem', fontWeight: 600, color: 'var(--gray-900)', marginBottom: 32, letterSpacing: '-0.022em' }}>
            Full feature comparison
          </h2>
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '13px 20px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-400)' }}>Feature</th>
                  {['Starter', 'Pro', 'Enterprise'].map((t) => (
                    <th key={t} style={{ textAlign: 'center', padding: '13px 20px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: t === 'Pro' ? 'var(--blue-600)' : 'var(--gray-400)' }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: i < compare.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <td style={{ padding: '13px 20px', fontSize: '0.86rem', color: 'var(--gray-700)' }}>{row.feature}</td>
                    <td style={{ textAlign: 'center', padding: '13px 20px' }}>{row.starter ? <Check /> : <X />}</td>
                    <td style={{ textAlign: 'center', padding: '13px 20px', background: 'rgba(37,99,235,0.03)' }}>{row.pro ? <Check /> : <X />}</td>
                    <td style={{ textAlign: 'center', padding: '13px 20px' }}>{row.enterprise ? <Check /> : <X />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Benchmark callout */}
        <div className="pricing-section" style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 40px 0' }}>
          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '24px 28px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-900)', marginBottom: 5 }}>How we compare</p>
              <p style={{ fontSize: '0.86rem', color: 'var(--gray-500)', lineHeight: 1.7, maxWidth: 700 }}>
                PropStream alone is $99 to $399/mo for data only. Add a dialer ($100 to $200/mo), a CRM, and a contract platform and you&apos;re at $400 to $700/mo with no automation and no matching. DealFlow AI replaces all of it for less and actually does the work.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="pricing-section" style={{ maxWidth: 760, margin: '0 auto', padding: '80px 40px 96px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'inherit', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '-0.022em', color: 'var(--gray-900)', marginBottom: 12, lineHeight: 1.15 }}>
            Ready to close more deals?
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>
            Join the waitlist today and lock in founding member pricing before we launch.
          </p>
          <Link
            href="/#cta"
            style={{
              display: 'inline-block',
              background: 'var(--gray-900)',
              color: 'var(--white)',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              padding: '12px 28px',
              borderRadius: 9,
              letterSpacing: '-0.01em',
              transition: 'opacity 0.15s',
            }}
          >
            Join the waitlist
          </Link>
          <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 12 }}>
            No credit card · Founding members lock in pricing forever
          </p>
        </div>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 860px) {
          .pricing-hero { padding: 56px 20px 48px !important; }
          .pricing-section { padding-left: 20px !important; padding-right: 20px !important; }
          .pricing-compare { padding-top: 48px !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
.pricing-compare table { font-size: 0.82rem; }
          .pricing-compare td, .pricing-compare th { padding: 10px 14px !important; }
        }
      `}</style>
    </>
  )
}
