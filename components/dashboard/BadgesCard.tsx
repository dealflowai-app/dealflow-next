'use client'

import { useState, useEffect, useRef } from 'react'
import BadgeNotification from '@/components/ui/BadgeNotification'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

type BadgeData = {
  type: string
  name: string
  description: string
  icon: string
  earned: boolean
  earnedAt: string | null
  progress: number | null
  progressMax: number | null
}

export default function BadgesCard() {
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [newlyAwarded, setNewlyAwarded] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ type: string; x: number; y: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/badges')
      .then(r => r.json())
      .then(d => {
        if (d.badges) setBadges(d.badges)
        if (d.newlyAwarded?.length) setNewlyAwarded(d.newlyAwarded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleDismissNotification(type: string) {
    setNewlyAwarded(prev => prev.filter(t => t !== type))
  }

  function handleMouseEnter(type: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ type, x: rect.left + rect.width / 2, y: rect.top })
  }

  function handleMouseLeave() {
    setTooltip(null)
  }

  const earned = badges.filter(b => b.earned)
  const unearned = badges.filter(b => !b.earned)
  const tooltipBadge = tooltip ? badges.find(b => b.type === tooltip.type) : null

  if (loading) {
    return (
      <div
        className="ds-card bg-white border border-[rgba(5,14,36,0.06)]"
        style={{ borderRadius: 10, padding: '20px 24px', fontFamily: FONT }}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(5,14,36,0.04)]">
          <h3 style={{ fontWeight: 600, fontSize: 15, color: '#0B1224', fontFamily: FONT, margin: 0 }}>
            Achievements
          </h3>
        </div>
        <div className="flex items-center justify-center h-[80px]">
          <span className="text-sm text-[rgba(5,14,36,0.3)]">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Badge notification popups */}
      {newlyAwarded.map(type => {
        const badge = badges.find(b => b.type === type)
        if (!badge) return null
        return (
          <BadgeNotification
            key={type}
            icon={badge.icon}
            name={badge.name}
            description={badge.description}
            onDismiss={() => handleDismissNotification(type)}
          />
        )
      })}

      <div
        className="ds-card bg-white border border-[rgba(5,14,36,0.06)]"
        style={{ borderRadius: 10, padding: '20px 24px', fontFamily: FONT }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(5,14,36,0.04)]">
          <h3 style={{ fontWeight: 600, fontSize: 15, color: '#0B1224', fontFamily: FONT, margin: 0 }}>
            Achievements
          </h3>
          <span style={{ fontSize: 12, color: 'rgba(5,14,36,0.4)', fontWeight: 500, fontFamily: FONT }}>
            {earned.length}/{badges.length}
          </span>
        </div>

        {/* Earned badges */}
        {earned.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {earned.map(badge => (
              <div
                key={badge.type}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg cursor-default transition-all duration-150 hover:bg-[rgba(37,99,235,0.04)]"
                onMouseEnter={e => handleMouseEnter(badge.type, e)}
                onMouseLeave={handleMouseLeave}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>{badge.icon}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 550,
                  color: '#0B1224',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  fontFamily: FONT,
                }}>
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Unearned badges */}
        {unearned.length > 0 && (
          <>
            {earned.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(5,14,36,0.04)', marginBottom: 12 }} />
            )}
            <div className="grid grid-cols-4 gap-2">
              {unearned.map(badge => (
                <div
                  key={badge.type}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg cursor-default transition-all duration-150 hover:bg-[rgba(5,14,36,0.02)]"
                  onMouseEnter={e => handleMouseEnter(badge.type, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="relative">
                    <span style={{ fontSize: 24, lineHeight: 1, filter: 'grayscale(1)', opacity: 0.3 }}>
                      {badge.icon}
                    </span>
                    <span
                      className="absolute -bottom-0.5 -right-1"
                      style={{ fontSize: 10, lineHeight: 1 }}
                    >
                      🔒
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'rgba(5,14,36,0.3)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    fontFamily: FONT,
                  }}>
                    {badge.name}
                  </span>
                  {/* Progress bar */}
                  {badge.progress !== null && badge.progressMax !== null && badge.progress > 0 && (
                    <div className="w-full">
                      <div
                        style={{
                          height: 3,
                          borderRadius: 2,
                          background: 'rgba(5,14,36,0.06)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min((badge.progress / badge.progressMax) * 100, 100)}%`,
                            background: '#2563EB',
                            borderRadius: 2,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: 'rgba(5,14,36,0.35)',
                        textAlign: 'center',
                        marginTop: 2,
                        fontFamily: FONT,
                      }}>
                        {badge.progress}/{badge.progressMax}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {badges.length === 0 && (
          <div className="flex items-center justify-center h-[60px]">
            <span className="text-sm text-[rgba(5,14,36,0.35)]">Start using DealFlow to earn badges!</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && tooltipBadge && (
        <div
          ref={tooltipRef}
          className="fixed z-[10000] pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div
            style={{
              background: '#0B1224',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 12px',
              fontFamily: FONT,
              maxWidth: 200,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
              {tooltipBadge.icon} {tooltipBadge.name}
            </div>
            <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.3 }}>
              {tooltipBadge.description}
            </div>
            {tooltipBadge.earned && tooltipBadge.earnedAt && (
              <div style={{ fontSize: 9, opacity: 0.5, marginTop: 3 }}>
                Earned {new Date(tooltipBadge.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            {!tooltipBadge.earned && tooltipBadge.progress !== null && tooltipBadge.progressMax !== null && (
              <div style={{ fontSize: 9, opacity: 0.5, marginTop: 3 }}>
                Progress: {tooltipBadge.progress}/{tooltipBadge.progressMax}
              </div>
            )}
          </div>
          {/* Arrow */}
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #0B1224',
            margin: '0 auto',
          }} />
        </div>
      )}
    </>
  )
}
