'use client'

import Image from 'next/image'

/* ── Tokens ─────────────────────────────────────────────── */
const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.65)'
const MUTED = 'rgba(5, 14, 36, 0.45)'
const BORDER = 'rgba(5, 14, 36, 0.06)'

/* ── Data ───────────────────────────────────────────────── */
const beliefs = [
  {
    num: '01',
    title: 'The disposition process is broken by design',
    body: 'AI can fix it without removing the human relationships that actually close deals. Technology should handle the volume. You handle the relationship.',
  },
  {
    num: '02',
    title: 'Cash buyers deserve better deal flow',
    body: 'Not mass blasts. Not irrelevant properties. Precision matches that respect their time and match their actual buy box, every single time.',
  },
  {
    num: '03',
    title: 'The best software feels invisible',
    body: "It should just make things happen. Not create more tasks, more dashboards, or more complexity to learn. You should feel the results before you feel the tool.",
  },
]

const stats = [
  { target: 15, prefix: '$', suffix: 'B+', label: 'Annual wholesale market' },
  { target: 2, prefix: '', suffix: 'M+', label: 'Off-market deals per year' },
  { target: 72, prefix: '', suffix: ' hrs', label: 'Avg. time to first offer' },
  { target: 50, prefix: '', suffix: '', label: 'States covered at launch' },
]

/* ── Page ───────────────────────────────────────────────── */
export default function AboutContent() {
  return (
    <>
      <main style={{ paddingTop: 62 }}>

        {/* ── Hero ────────────────────────────────────────── */}
        <div style={{
          background: 'white',
          backgroundImage: 'radial-gradient(600px circle at 80% 20%, rgba(37,99,235,0.03), transparent)',
        }}>
          <div className="about-hero reveal" style={{
            maxWidth: 800, margin: '0 auto', padding: '80px 40px 80px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: BLUE, marginBottom: 22, fontFamily: F,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE, display: 'inline-block' }} />
              Our story
            </div>
            <h1 style={{
              fontFamily: SERIF,
              fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
              fontWeight: 400, letterSpacing: '-0.04em',
              color: NAVY, lineHeight: 1.1, marginBottom: 22,
            }}>
              We Lost A Deal.<br />Then We Built The Fix.
            </h1>
            <p style={{
              fontSize: '1.1rem', fontFamily: F, fontWeight: 400,
              color: 'rgba(5, 14, 36, 0.55)', lineHeight: 1.8,
              maxWidth: 640, margin: '0 auto',
            }}>
              DealFlow AI didn&apos;t start with a pitch deck. It started with a missed assignment fee and
              the frustration of knowing the deal was there. The system just wasn&apos;t.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: BORDER, maxWidth: 900, margin: '0 auto' }} />

        {/* ── Quote ───────────────────────────────────────── */}
        <div className="reveal" style={{
          maxWidth: 800, margin: '0 auto', padding: '80px 40px',
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: SERIF, fontSize: 48, lineHeight: 0.6,
            color: 'rgba(37,99,235,0.12)', marginBottom: 24, display: 'block',
          }}>
            &ldquo;
          </span>
          <p style={{
            fontFamily: SERIF,
            fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
            fontStyle: 'italic', fontWeight: 400, color: NAVY,
            lineHeight: 1.7, letterSpacing: '-0.02em',
            maxWidth: 800, margin: '0 auto 20px',
          }}>
            I had the contract. I had the property. I just didn&apos;t have a buyer in time. The deal
            fell through and I lost $14,000 in assignment fees. Not because the deal was bad, but
            because finding the right buyer was a full-time job I didn&apos;t have time for.
          </p>
          <p style={{ fontSize: 14, fontFamily: F, fontWeight: 500, color: 'rgba(5,14,36,0.4)' }}>
            Founder, DealFlow AI
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: BORDER, maxWidth: 900, margin: '0 auto' }} />

        {/* ── Body sections ───────────────────────────────── */}
        <div className="about-body" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px 80px' }}>

          {/* ── The Problem ─────────────────────────────── */}
          <div className="about-block reveal" style={{
            display: 'grid', gridTemplateColumns: '180px 1fr',
            gap: 48, padding: '60px 0',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: BLUE, fontFamily: F,
              paddingTop: 5, position: 'sticky' as const, top: 100, alignSelf: 'start',
            }}>
              The problem
            </div>
            <div style={{ maxWidth: 640 }}>
              <h2 style={{
                fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400,
                letterSpacing: '-0.03em', color: NAVY, marginBottom: 16, lineHeight: 1.25,
              }}>
                Disposition is broken. And everyone just accepts it.
              </h2>
              <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: BODY, lineHeight: 1.85, marginBottom: 20 }}>
                The wholesale real estate industry moves at a pace that manual processes can&apos;t keep up
                with. You have days, sometimes hours, to find a qualified buyer before your contract expires.
                Yet the tools available were built for agents, not wholesalers.
              </p>
              <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: BODY, lineHeight: 1.85, marginBottom: 20 }}>
                Cold calling lists of 500 people who may or may not still be buying. Mass blasting deals to
                everyone in a generic CRM. Following up manually while juggling five other contracts.{' '}
                <strong style={{ color: NAVY, fontWeight: 600 }}>This is how deals die.</strong>
              </p>
              <div style={{
                borderLeft: `3px solid ${BLUE}`,
                padding: '16px 0 16px 24px', margin: '20px 0',
              }}>
                <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: 'rgba(5,14,36,0.55)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                  The average wholesaler spends over 60% of their time on disposition: the part after
                  finding a deal. That&apos;s the problem we&apos;re solving.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER }} />

          {/* ── Why We Built This ───────────────────────── */}
          <div className="about-block reveal" style={{
            display: 'grid', gridTemplateColumns: '180px 1fr',
            gap: 48, padding: '60px 0',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: BLUE, fontFamily: F,
              paddingTop: 5, position: 'sticky' as const, top: 100, alignSelf: 'start',
            }}>
              Why we built this
            </div>
            <div style={{ maxWidth: 640 }}>
              <h2 style={{
                fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400,
                letterSpacing: '-0.03em', color: NAVY, marginBottom: 16, lineHeight: 1.25,
              }}>
                From the grind to the algorithm
              </h2>
              <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: BODY, lineHeight: 1.85, marginBottom: '1.5rem' }}>
                After losing that deal, we started documenting exactly what a perfect disposition process
                would look like if time and resources weren&apos;t a constraint. What if you had a team that
                could call 200 buyers overnight? What if every buyer in your database was automatically
                profiled by what they actually want to buy?
              </p>
              <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: BODY, lineHeight: 1.85, marginBottom: '1.5rem' }}>
                We spent months talking to wholesalers across the country. The same story came up every time: too many deals lost not because of bad sourcing, but because of a broken system on the back end.
              </p>
              <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: BODY, lineHeight: 1.85, marginBottom: 0 }}>
                <strong style={{ color: NAVY, fontWeight: 600, fontSize: 16 }}>So we built the system.</strong>{' '}
                One that works the moment you activate it, handles the part of wholesaling that nobody wants
                to do manually, and gets smarter the more you use it.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER }} />

          {/* ── What We Believe ─────────────────────────── */}
          <div className="about-block reveal" style={{
            display: 'grid', gridTemplateColumns: '180px 1fr',
            gap: 48, padding: '60px 0',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: BLUE, fontFamily: F,
              paddingTop: 5, position: 'sticky' as const, top: 100, alignSelf: 'start',
            }}>
              What we believe
            </div>
            <div style={{ maxWidth: 640 }}>
              <h2 style={{
                fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400,
                letterSpacing: '-0.03em', color: NAVY, marginBottom: 16, lineHeight: 1.25,
              }}>
                Three things we won&apos;t compromise on
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {beliefs.map((b, i) => (
                  <div key={i} className="belief-card" style={{
                    background: 'white', border: `1px solid ${BORDER}`,
                    borderRadius: 10, padding: '24px 28px',
                    display: 'flex', gap: 16, alignItems: 'flex-start',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontFamily: F, fontWeight: 700, fontSize: 12, color: 'white' }}>{b.num}</span>
                    </div>
                    <div>
                      <p style={{ fontFamily: F, fontWeight: 600, fontSize: 15, color: NAVY, marginBottom: 4 }}>
                        {b.title}
                      </p>
                      <p style={{ fontFamily: F, fontWeight: 400, fontSize: 14, color: 'rgba(5,14,36,0.55)', lineHeight: 1.7, margin: 0 }}>
                        {b.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER }} />

          {/* ── The Founder ─────────────────────────────── */}
          <div className="about-block reveal" style={{
            display: 'grid', gridTemplateColumns: '180px 1fr',
            gap: 48, padding: '60px 0',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: BLUE, fontFamily: F,
              paddingTop: 5, position: 'sticky' as const, top: 100, alignSelf: 'start',
            }}>
              The founder
            </div>
            <div style={{ maxWidth: 640 }}>
              <h2 style={{
                fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400,
                letterSpacing: '-0.03em', color: NAVY, marginBottom: 16, lineHeight: 1.25,
              }}>
                Built by one person who actually does this
              </h2>
              <div style={{
                background: 'white', border: `1px solid ${BORDER}`,
                borderRadius: 10, padding: 32,
                boxShadow: '0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid rgba(37,99,235,0.3)',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: F, fontWeight: 700, fontSize: 20, color: 'white', letterSpacing: '0.02em' }}>JH</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: F, fontWeight: 600, fontSize: 16, color: NAVY, margin: 0 }}>Founder, DealFlow AI</p>
                    <p style={{ fontFamily: F, fontWeight: 500, fontSize: 13, color: BLUE, margin: '2px 0 0' }}>Builder, Wholesaler, Operator</p>
                  </div>
                </div>
                <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: BODY, lineHeight: 1.8, marginBottom: 14 }}>
                  Active real estate wholesaler who got tired of the manual grind and started building.
                  Not a software company that discovered real estate. A real estate operator who learned
                  to build software. That distinction matters in every product decision we make.
                </p>
                <p style={{ fontSize: 15, fontFamily: F, fontWeight: 400, color: BODY, lineHeight: 1.8, marginBottom: 20, fontStyle: 'italic' }}>
                  I personally respond to every message. If you&apos;re a wholesaler or a cash buyer and
                  want to talk before the product launches, reach out. These conversations shape
                  everything we build.
                </p>
                <a
                  href="mailto:hello@dealflowai.app"
                  className="about-email-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    border: `1px solid ${BLUE}`, borderRadius: 10,
                    padding: '8px 20px', fontFamily: F, fontWeight: 500, fontSize: 14,
                    color: BLUE, textDecoration: 'none', transition: 'all 0.2s ease',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  hello@dealflowai.app
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="reveal" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px 80px' }}>
          <div style={{
            background: 'rgba(5,14,36,0.02)', borderRadius: 10,
            border: `1px solid ${BORDER}`, overflow: 'hidden',
          }}>
            <div className="stats-grid" style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            }}>
              {stats.map((stat, i, arr) => (
                <div key={i} style={{
                  padding: '40px 24px', textAlign: 'center',
                  borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <div
                    data-counter=""
                    data-target={stat.target}
                    data-prefix={stat.prefix}
                    data-suffix={stat.suffix}
                    style={{
                      fontFamily: F, fontSize: '2.5rem', fontWeight: 800,
                      color: NAVY, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6,
                    }}
                  >
                    {stat.prefix}{stat.target}{stat.suffix}
                  </div>
                  <div style={{ fontSize: 13, fontFamily: F, fontWeight: 400, color: MUTED }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ─────────────────────────────────────────── */}
        <div style={{
          position: 'relative', padding: '80px 40px',
          background: NAVY, overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.03, pointerEvents: 'none' }}>
            <Image src="/Logo.png" alt="" width={240} height={240} style={{ objectFit: 'contain' }} />
          </div>
          <div className="reveal" style={{
            position: 'relative', zIndex: 2,
            maxWidth: 580, margin: '0 auto', textAlign: 'center',
          }}>
            <h2 style={{
              fontFamily: SERIF,
              fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
              fontWeight: 400, letterSpacing: '-0.022em',
              color: 'white', lineHeight: 1.15, marginBottom: 14,
            }}>
              If any of this resonates, you&apos;re who this is for.
            </h2>
            <p style={{
              fontSize: '1rem', fontFamily: F, fontWeight: 400,
              color: 'rgba(255,255,255,0.65)', lineHeight: 1.7,
              maxWidth: 400, margin: '0 auto 28px',
            }}>
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
            <p style={{
              fontSize: '0.82rem', fontFamily: F,
              color: 'rgba(255,255,255,0.5)', marginTop: 14,
            }}>
              Or email us directly at hello@dealflowai.app. We actually respond.
            </p>
          </div>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .belief-card:hover {
          border-color: rgba(37,99,235,0.15) !important;
          box-shadow: 0 4px 12px rgba(5,14,36,0.04) !important;
        }
        .about-email-btn:hover {
          background: ${BLUE} !important;
          color: white !important;
        }
        @media (max-width: 860px) {
          .about-hero { padding: 60px 20px 60px !important; }
          .about-body { padding: 0 20px 64px !important; }
          .about-block { grid-template-columns: 1fr !important; gap: 10px !important; padding: 40px 0 !important; }
          .about-block > div:first-child { position: static !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      ` }} />
    </>
  )
}
