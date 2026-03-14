'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function AboutContent() {
  const revealRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <>
      {/* HERO */}
      <div
        style={{
          padding: '148px 56px 88px',
          maxWidth: 960,
          margin: '0 auto',
          textAlign: 'center',
        }}
        className="about-hero-wrap"
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--blue-600)',
            marginBottom: 22,
          }}
        >
          <span
            className="eyebrow-dot"
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}
          />
          Our story
        </div>

        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--gray-900)',
            lineHeight: 1.1,
            marginBottom: 22,
          }}
        >
          We lost a deal.<br />Then we built the fix.
        </h1>

        <p
          style={{
            fontSize: '1.05rem',
            color: 'var(--gray-500)',
            lineHeight: 1.75,
            maxWidth: 960,
            margin: '0 auto',
          }}
        >
          DealFlow AI didn&apos;t start with a pitch deck. It started with a missed assignment fee and
          the frustration of knowing the deal was there. The system just wasn&apos;t.
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--gray-100)', maxWidth: 1100, margin: '0 auto' }} />

      {/* VULNERABILITY HOOK */}
      <div
        className="story-hook reveal"
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '80px 40px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: '5rem',
            lineHeight: 0.6,
            color: 'var(--blue-200)',
            marginBottom: 24,
            display: 'block',
          }}
        >
          &ldquo;
        </span>
        <p
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 'clamp(1.25rem, 2.5vw, 1.65rem)',
            fontWeight: 600,
            color: 'var(--gray-900)',
            lineHeight: 1.45,
            letterSpacing: '-0.02em',
            marginBottom: 20,
          }}
        >
          I had the contract. I had the property. I just didn&apos;t have a buyer in time. The deal
          fell through and I lost $14,000 in assignment fees. Not because the deal was bad, but
          because finding the right buyer was a full-time job I didn&apos;t have time for.
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', fontWeight: 500 }}>
          Founder, DealFlow AI
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--gray-100)', maxWidth: 1100, margin: '0 auto' }} />

      {/* ABOUT BODY */}
      <div
        className="about-body-wrap"
        style={{ maxWidth: 1100, margin: '0 auto', padding: '0 56px 80px' }}
      >
        {/* Block 1: The problem */}
        <div
          className="about-block-grid reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: 52,
            padding: '60px 0',
            borderTop: '1px solid var(--gray-100)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', paddingTop: 5, lineHeight: 1.4 }}>
            The problem
          </div>
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--gray-900)', marginBottom: 16, lineHeight: 1.25 }}>
              Disposition is broken. And everyone just accepts it.
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.82, marginBottom: 14 }}>
              The wholesale real estate industry moves at a pace that manual processes can&apos;t keep up
              with. You have days, sometimes hours, to find a qualified buyer before your contract expires.
              Yet the tools available were built for agents, not wholesalers.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.82, marginBottom: 14 }}>
              Cold calling lists of 500 people who may or may not still be buying. Mass blasting deals to
              everyone in a generic CRM. Following up manually while juggling five other contracts.{' '}
              <strong style={{ color: 'var(--gray-700)', fontWeight: 600 }}>This is how deals die.</strong>
            </p>
            <div
              style={{
                background: 'var(--blue-50)',
                borderLeft: '3px solid var(--blue-600)',
                borderRadius: '0 8px 8px 0',
                padding: '14px 18px',
                margin: '20px 0',
                fontSize: '0.93rem',
                color: 'var(--gray-700)',
                lineHeight: 1.7,
              }}
            >
              The average wholesaler spends over 60% of their time on disposition: the part after
              finding a deal. That&apos;s the problem we&apos;re solving.
            </div>
          </div>
        </div>

        {/* Block 2: Why we built this */}
        <div
          className="about-block-grid reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: 52,
            padding: '60px 0',
            borderTop: '1px solid var(--gray-100)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', paddingTop: 5, lineHeight: 1.4 }}>
            Why we built this
          </div>
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--gray-900)', marginBottom: 16, lineHeight: 1.25 }}>
              From the grind to the algorithm
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.82, marginBottom: 14 }}>
              After losing that deal, we started documenting exactly what a perfect disposition process
              would look like if time and resources weren&apos;t a constraint. What if you had a team that
              could call 200 buyers overnight? What if every buyer in your database was automatically
              profiled by what they actually want to buy?
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.82, marginBottom: 14 }}>
              We spent months talking to wholesalers across the country. The same story came up every time: too many deals lost not because of bad sourcing, but because of a broken system on the back end.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.82, marginBottom: 0 }}>
              <strong style={{ color: 'var(--gray-700)', fontWeight: 600 }}>So we built the system.</strong>{' '}
              One that works the moment you activate it, handles the part of wholesaling that nobody wants
              to do manually, and gets smarter the more you use it.
            </p>
          </div>
        </div>

        {/* Block 3: What we believe */}
        <div
          className="about-block-grid reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: 52,
            padding: '60px 0',
            borderTop: '1px solid var(--gray-100)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', paddingTop: 5, lineHeight: 1.4 }}>
            What we believe
          </div>
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--gray-900)', marginBottom: 16, lineHeight: 1.25 }}>
              Three things we won&apos;t compromise on
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              {[
                {
                  num: '01',
                  title: 'The disposition process is broken by design',
                  body: 'AI can fix it without removing the human relationships that actually close deals. Technology should handle the volume. You handle the relationship.',
                },
                {
                  num: '02',
                  title: 'Cash buyers deserve better deal flow',
                  body: "Not mass blasts. Not irrelevant properties. Precision matches that respect their time and match their actual buy box, every single time.",
                },
                {
                  num: '03',
                  title: 'The best software feels invisible',
                  body: 'It should just make things happen. Not create more tasks, more dashboards, or more complexity to learn. You should feel the results before you feel the tool.',
                },
              ].map((belief, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-100)',
                    borderRadius: 10,
                    padding: '18px 20px',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: 'var(--blue-600)',
                      background: 'var(--blue-50)',
                      border: '1px solid var(--blue-100)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      flexShrink: 0,
                      marginTop: 1,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {belief.num}
                  </span>
                  <div style={{ fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: 1.65 }}>
                    <strong style={{ color: 'var(--gray-900)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                      {belief.title}
                    </strong>
                    {belief.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Block 4: The founder */}
        <div
          className="about-block-grid reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: 52,
            padding: '60px 0',
            borderTop: '1px solid var(--gray-100)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', paddingTop: 5, lineHeight: 1.4 }}>
            The founder
          </div>
          <div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--gray-900)', marginBottom: 16, lineHeight: 1.25 }}>
              Built by one person who actually does this
            </h2>
            <div
              style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: 14,
                padding: 28,
                marginTop: 4,
                display: 'flex',
                gap: 22,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--blue-600), #60A5FA)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                D
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                  Founder, DealFlow AI
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--blue-600)', fontWeight: 600, marginBottom: 12 }}>
                  Builder · Wholesaler · Operator
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', lineHeight: 1.72, marginBottom: 14 }}>
                  Active real estate wholesaler who got tired of the manual grind and started building.
                  Not a software company that discovered real estate. A real estate operator who learned
                  to build software. That distinction matters in every product decision we make.
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', lineHeight: 1.72, marginBottom: 14 }}>
                  I personally respond to every message. If you&apos;re a wholesaler or a cash buyer and
                  want to talk before the product launches, reach out. These conversations shape
                  everything we build.
                </p>
                <a
                  href="mailto:hello@dealflow.ai"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--blue-600)',
                    textDecoration: 'none',
                    border: '1px solid var(--blue-200)',
                    background: 'var(--blue-50)',
                    borderRadius: 7,
                    padding: '6px 12px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-100)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-50)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  hello@dealflow.ai
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div
        className="reveal"
        style={{
          borderTop: '1px solid var(--gray-100)',
          borderBottom: '1px solid var(--gray-100)',
          background: 'var(--gray-50)',
        }}
      >
        <div
          className="stats-inner-grid"
          style={{
            maxWidth: 760,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
          }}
        >
          {[
            { num: '$15B+', blue: true, label: 'Annual wholesale market' },
            { num: '2M+', blue: false, label: 'Off-market deals per year' },
            { num: '72 hrs', blue: false, label: 'Avg. time to first offer' },
            { num: '50', blue: true, label: 'States covered at launch' },
          ].map((stat, i, arr) => (
            <div
              key={i}
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid var(--gray-200)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: stat.blue ? 'var(--blue-600)' : 'var(--gray-900)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  marginBottom: 5,
                }}
              >
                {stat.num}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--gray-400)', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          padding: '88px 56px',
          textAlign: 'center',
          background: 'var(--gray-50)',
          borderTop: '1px solid var(--gray-100)',
        }}
        className="about-cta-wrap"
      >
        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--gray-900)',
            lineHeight: 1.15,
            marginBottom: 12,
          }}
        >
          If any of this resonates, you&apos;re who this is for.
        </h2>
        <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', marginBottom: 28 }}>
          Join the waitlist. No credit card, no commitment. Just early access and founding member
          pricing locked in forever.
        </p>
        <Link
          href="/#cta"
          style={{
            background: 'var(--blue-600)',
            color: 'white',
            padding: '12px 26px',
            borderRadius: 8,
            border: 'none',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
            letterSpacing: '-0.01em',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Join the waitlist →
        </Link>
        <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)', marginTop: 12 }}>
          Or email us directly at hello@dealflow.ai. We actually respond.
        </p>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .about-hero-wrap { padding: 120px 20px 64px !important; }
          .story-hook { padding: 60px 20px !important; }
          .about-body-wrap { padding: 0 20px 64px !important; }
          .about-block-grid { grid-template-columns: 1fr !important; gap: 10px !important; padding: 40px 0 !important; }
          .stats-inner-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .about-cta-wrap { padding: 64px 20px !important; }
        }
      `}</style>
    </>
  )
}
