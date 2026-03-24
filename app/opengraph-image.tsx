import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'DealFlow AI - Close More Deals Without Doing More Work'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #050E24 0%, #0B1A3E 50%, #0F2352 100%)',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Accent glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '0 80px',
            position: 'relative',
          }}
        >
          {/* Logo row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: 'white',
                fontWeight: 700,
              }}
            >
              D
            </div>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.02em',
              }}
            >
              DealFlow AI
            </span>
          </div>

          {/* Eyebrow */}
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '20px',
            }}
          >
            Built for Real Estate Wholesalers
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              maxWidth: '900px',
              marginBottom: '24px',
            }}
          >
            Close More Deals Without Doing More Work
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.6)',
              textAlign: 'center',
              lineHeight: 1.5,
              maxWidth: '700px',
              marginBottom: '36px',
            }}
          >
            Find buyers. AI calls and qualifies them. Match to deals. Generate contracts. All on autopilot.
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Find Buyers', 'AI Outreach', 'Smart Matching', 'Contracts', 'Ask AI'].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    background: 'rgba(37,99,235,0.15)',
                    border: '1px solid rgba(37,99,235,0.3)',
                    color: '#93B4FF',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
