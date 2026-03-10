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

const buyerTiers = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    tagline: 'For investors getting started on the platform',
    highlight: false,
    features: [
      'Live deal map (deals matching your buy box)',
      'View deal summaries and AI analysis',
      'No credit card required',
      'Acquired organically through wholesaler campaigns',
    ],
    cta: 'Join free',
  },
  {
    name: 'Premium',
    price: '$49',
    period: '/mo',
    tagline: 'For serious investors who want the edge',
    highlight: true,
    badge: 'Best for investors',
    features: [
      'Early deal access before the broader pool',
      'Full AI deal analysis with comp data',
      'Priority offer placement',
      'Deal alert notifications via SMS + email',
      'Saved searches and custom map filters',
    ],
    cta: 'Join waitlist',
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
        <div className="pricing-hero" style={{ maxWidth: 760, margin: '0 auto', padding: '72px 40px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 16 }}>
            Pricing
          </p>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--gray-900)', marginBottom: 16, lineHeight: 1.1 }}>
            Simple pricing, serious results
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--gray-500)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 16px' }}>
            Replace PropStream, your dialer, your CRM, and your contract platform. All in one. Founding members lock in their rate forever.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '6px 16px', fontSize: '0.8rem', color: '#166534', fontWeight: 500 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Founding member pricing locked in during beta
          </div>
        </div>

        {/* Wholesaler tiers */}
        <div className="pricing-section" style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 40px 0' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 24 }}>
            For wholesalers
          </p>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {wholesalerTiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  borderRadius: 16,
                  border: tier.highlight ? '2px solid var(--blue-600)' : '1px solid var(--gray-200)',
                  padding: '32px 28px',
                  background: tier.highlight ? 'linear-gradient(135deg, #f0f6ff 0%, #fff 100%)' : 'var(--white)',
                  position: 'relative',
                  boxShadow: tier.highlight ? 'var(--shadow-lg)' : 'var(--shadow)',
                }}
              >
                {tier.badge && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--blue-600)', color: 'white', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {tier.badge}
                  </div>
                )}
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8 }}>{tier.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '2.4rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.03em' }}>{tier.price}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>{tier.period}</span>
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--gray-500)', marginBottom: 24, lineHeight: 1.5 }}>{tier.tagline}</p>
                <Link
                  href={tier.ctaHref ?? '/#cta'}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '11px 20px',
                    borderRadius: 9,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: tier.highlight ? 'var(--blue-600)' : 'var(--white)',
                    color: tier.highlight ? 'var(--white)' : 'var(--gray-700)',
                    border: tier.highlight ? 'none' : '1px solid var(--gray-200)',
                    marginBottom: 24,
                    transition: 'all 0.15s',
                  }}
                >
                  {tier.cta}
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tier.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check />
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buyer tiers */}
        <div className="pricing-section" style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 40px 0' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 24 }}>
            For cash buyers & investors
          </p>
          <div className="pricing-buyer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 760 }}>
            {buyerTiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  borderRadius: 16,
                  border: tier.highlight ? '2px solid var(--blue-600)' : '1px solid var(--gray-200)',
                  padding: '32px 28px',
                  background: tier.highlight ? 'linear-gradient(135deg, #f0f6ff 0%, #fff 100%)' : 'var(--white)',
                  position: 'relative',
                  boxShadow: tier.highlight ? 'var(--shadow-lg)' : 'var(--shadow)',
                }}
              >
                {tier.badge && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--blue-600)', color: 'white', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {tier.badge}
                  </div>
                )}
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8 }}>{tier.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '2.4rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.03em' }}>{tier.price}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>{tier.period}</span>
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--gray-500)', marginBottom: 24, lineHeight: 1.5 }}>{tier.tagline}</p>
                <Link
                  href="/#cta"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '11px 20px',
                    borderRadius: 9,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: tier.highlight ? 'var(--blue-600)' : 'var(--white)',
                    color: tier.highlight ? 'var(--white)' : 'var(--gray-700)',
                    border: tier.highlight ? 'none' : '1px solid var(--gray-200)',
                    marginBottom: 24,
                  }}
                >
                  {tier.cta}
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tier.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}><Check /></div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="pricing-section pricing-compare" style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 40px' }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 32, letterSpacing: '-0.02em' }}>
            Full feature comparison
          </h2>
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)' }}>Feature</th>
                  {['Starter', 'Pro', 'Enterprise'].map((t) => (
                    <th key={t} style={{ textAlign: 'center', padding: '14px 20px', fontSize: '0.8rem', fontWeight: 600, color: t === 'Pro' ? 'var(--blue-600)' : 'var(--gray-500)' }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: i < compare.length - 1 ? '1px solid var(--gray-100)' : 'none', background: i % 2 === 0 ? 'var(--white)' : 'var(--gray-50)' }}>
                    <td style={{ padding: '13px 20px', fontSize: '0.87rem', color: 'var(--gray-700)' }}>{row.feature}</td>
                    <td style={{ textAlign: 'center', padding: '13px 20px' }}>{row.starter ? <Check /> : <X />}</td>
                    <td style={{ textAlign: 'center', padding: '13px 20px' }}>{row.pro ? <Check /> : <X />}</td>
                    <td style={{ textAlign: 'center', padding: '13px 20px' }}>{row.enterprise ? <Check /> : <X />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Benchmark callout */}
        <div className="pricing-section pricing-benchmark" style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px 80px' }}>
          <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 14, padding: '28px 32px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1.5rem' }}>💡</div>
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gray-900)', marginBottom: 6 }}>How we compare</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.7, maxWidth: 680 }}>
                PropStream alone charges $99–$399/mo for data only. Add a dialer ($100–$200/mo), a CRM, and a contract platform and you&apos;re spending $400–$700/mo with no automation and no matching. DealFlow AI replaces all of it for less, and actually does the work for you.
              </p>
            </div>
          </div>
        </div>

      </main>
      <Footer />

      <style>{`
        @media (max-width: 860px) {
          .pricing-hero { padding: 56px 20px 16px !important; }
          .pricing-section { padding-left: 20px !important; padding-right: 20px !important; }
          .pricing-compare { padding-top: 48px !important; padding-bottom: 48px !important; }
          .pricing-benchmark { padding-bottom: 60px !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .pricing-buyer-grid { grid-template-columns: 1fr !important; max-width: 100% !important; }
          .pricing-compare table { font-size: 0.82rem; }
          .pricing-compare td, .pricing-compare th { padding: 10px 14px !important; }
        }
      `}</style>
    </>
  )
}
