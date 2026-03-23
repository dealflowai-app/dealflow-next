'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Search, Users, PhoneOutgoing,
  FolderOpen, FileSignature, Store, MessagesSquare,
  Sparkles, Settings, ArrowRight, X, ChevronRight,
  Map, Bell, Handshake, Rocket,
} from 'lucide-react'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

interface TourStep {
  /** CSS selector to highlight -if null, shows a centered modal instead */
  target: string | null
  title: string
  description: string
  icon: React.ReactNode
  /** Where to navigate before showing step (optional) */
  route?: string
  /** Preferred position of tooltip relative to target */
  position: 'bottom' | 'right' | 'top' | 'left' | 'center'
}

const TOUR_STEPS: TourStep[] = [
  // 1. Welcome modal (centered, no navigation)
  {
    target: null,
    title: 'Welcome to DealFlow AI',
    description: "Let's take a quick tour of your new platform. We'll walk through each section so you know exactly where everything is. This only takes about a minute.",
    icon: <Rocket className="w-6 h-6" />,
    position: 'center',
  },
  // 2. Dashboard - highlight sidebar, explain navigation
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    description: 'This sidebar is your main way to move between sections. Every tool you need is one click away. You can collapse it anytime for more screen space.',
    icon: <LayoutDashboard className="w-5 h-5" />,
    position: 'right',
    route: '/dashboard',
  },
  // 3. Stay on dashboard, explain the page
  {
    target: '[data-tour="dashboard-content"]',
    title: 'Your Dashboard',
    description: 'This is your command center. Track KPIs like revenue and deal count, view pipeline charts, monitor campaign performance, and see recent activity all in one place.',
    icon: <LayoutDashboard className="w-5 h-5" />,
    position: 'left',
    route: '/dashboard',
  },
  // 4. Navigate to /discovery
  {
    target: '[data-tour="discovery-content"]',
    title: 'Discovery',
    description: 'Search for properties and cash buyers by city or zip code. Use the interactive map to explore results, filter by property type, equity, and owner status, then import leads directly to your CRM.',
    icon: <Map className="w-5 h-5" />,
    position: 'bottom',
    route: '/discovery',
  },
  // 5. Navigate to /crm
  {
    target: '[data-tour="crm-content"]',
    title: 'CRM',
    description: 'Manage all your buyer contacts here. Import leads from Discovery, organize with tags and scoring, log calls and notes, and track every interaction through your pipeline.',
    icon: <Users className="w-5 h-5" />,
    position: 'bottom',
    route: '/crm',
  },
  // 6. Navigate to /outreach
  {
    target: '[data-tour="outreach-content"]',
    title: 'Outreach',
    description: 'Run multi-channel campaigns powered by your CRM. AI voice calling, SMS, and email are all built in with full recording, transcripts, and performance analytics.',
    icon: <PhoneOutgoing className="w-5 h-5" />,
    position: 'bottom',
    route: '/outreach',
  },
  // 7. Navigate to /deals
  {
    target: '[data-tour="deals-content"]',
    title: 'My Deals',
    description: 'Track every property you are working on. View asking price, ARV, spread, matched buyers, and incoming offers. You can also analyze new deals and generate reports from here.',
    icon: <FolderOpen className="w-5 h-5" />,
    position: 'bottom',
    route: '/deals',
  },
  // 8. Navigate to /marketplace
  {
    target: '[data-tour="marketplace-content"]',
    title: 'Marketplace',
    description: 'Browse deals posted by other wholesalers or list your own. Connect with active buyers, share buy-box criteria, and build your reputation score over time.',
    icon: <Store className="w-5 h-5" />,
    position: 'bottom',
    route: '/marketplace',
  },
  // 9. Navigate to /contracts
  {
    target: '[data-tour="contracts-content"]',
    title: 'Contracts',
    description: 'Create state-specific assignment contracts that auto-fill from your deal data. Send for e-signatures and keep a complete audit trail of every document.',
    icon: <FileSignature className="w-5 h-5" />,
    position: 'bottom',
    route: '/contracts',
  },
  // 10. Navigate to /community
  {
    target: '[data-tour="community-content"]',
    title: 'Community',
    description: 'Connect with other wholesalers through the feed, join groups, share wins, ask questions, and send direct messages. This is where deals and partnerships start.',
    icon: <MessagesSquare className="w-5 h-5" />,
    position: 'bottom',
    route: '/community',
  },
  // 11. Back to dashboard, highlight search button
  {
    target: '[data-tour="search-btn"]',
    title: 'Quick Search (Ctrl+K)',
    description: 'Press Ctrl+K anytime to open the command palette. Search pages, actions, buyers, and deals instantly from anywhere in the app.',
    icon: <Search className="w-5 h-5" />,
    position: 'bottom',
    route: '/dashboard',
  },
  // 12. Highlight Ask AI button
  {
    target: '[data-tour="ask-ai-btn"]',
    title: 'Ask AI',
    description: 'Your AI assistant has full context on your deals, buyers, and campaigns. Ask it for deal advice, buyer recommendations, market analysis, or strategy coaching.',
    icon: <Sparkles className="w-5 h-5" />,
    position: 'bottom',
    route: '/dashboard',
  },
  // 13. Highlight inbox/notification bell
  {
    target: '[data-tour="inbox-btn"]',
    title: 'Inbox & Notifications',
    description: 'Stay on top of everything. You will get notified when someone likes your post, comments, joins your group, sends you a message, or when a deal status changes.',
    icon: <Bell className="w-5 h-5" />,
    position: 'bottom',
    route: '/dashboard',
  },
  // 14. Final centered modal
  {
    target: null,
    title: "You're All Set!",
    description: "Your dashboard is populated with demo data so you can explore every feature. When you're ready to start fresh with real data, clear the demo from the banner at the top of the page.",
    icon: <Rocket className="w-6 h-6" />,
    position: 'center',
    route: '/dashboard',
  },
]

export default function ProductTour() {
  const router = useRouter()
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowDir: string }>({ top: 0, left: 0, arrowDir: 'top' })
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in')
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Listen for tour start event (dispatched from welcome page or settings)
  useEffect(() => {
    function handleStart() {
      setStep(0)
      setFadeState('in')
      setActive(true)
    }
    window.addEventListener('start-product-tour', handleStart)

    // Auto-start if coming from onboarding OR first-time user
    const shouldStart = localStorage.getItem('dealflow-start-tour')
    const tourCompleted = localStorage.getItem('dealflow-tour-completed')
    if (shouldStart) {
      localStorage.removeItem('dealflow-start-tour')
      setTimeout(handleStart, 800)
    } else if (!tourCompleted) {
      // First time visiting the dashboard -auto-start tour
      setTimeout(handleStart, 1200)
    }

    return () => window.removeEventListener('start-product-tour', handleStart)
  }, [])

  // Position tooltip relative to target
  const positionTooltip = useCallback(() => {
    if (!active) return
    const currentStep = TOUR_STEPS[step]
    if (!currentStep || currentStep.position === 'center' || !currentStep.target) {
      setHighlightRect(null)
      return
    }

    const el = document.querySelector(currentStep.target)
    if (!el) {
      setHighlightRect(null)
      return
    }

    const rect = el.getBoundingClientRect()
    setHighlightRect(rect)

    const tooltipW = 360
    const tooltipH = 200
    const gap = 16

    let top = 0
    let left = 0
    let arrowDir = 'top'

    switch (currentStep.position) {
      case 'right':
        top = rect.top + rect.height / 2 - tooltipH / 2
        left = rect.right + gap
        arrowDir = 'left'
        // Keep in viewport
        if (left + tooltipW > window.innerWidth - 20) {
          left = rect.left - tooltipW - gap
          arrowDir = 'right'
        }
        break
      case 'bottom':
        top = rect.bottom + gap
        left = rect.left + rect.width / 2 - tooltipW / 2
        arrowDir = 'top'
        // Keep in viewport
        if (left < 20) left = 20
        if (left + tooltipW > window.innerWidth - 20) left = window.innerWidth - tooltipW - 20
        break
      case 'top':
        top = rect.top - tooltipH - gap
        left = rect.left + rect.width / 2 - tooltipW / 2
        arrowDir = 'bottom'
        break
      case 'left':
        top = rect.top + rect.height / 2 - tooltipH / 2
        left = rect.left - tooltipW - gap
        arrowDir = 'right'
        break
    }

    // Keep in viewport vertically
    if (top < 20) top = 20
    if (top + tooltipH > window.innerHeight - 20) top = window.innerHeight - tooltipH - 20

    setTooltipPos({ top, left, arrowDir })
  }, [active, step])

  useEffect(() => {
    positionTooltip()
    window.addEventListener('resize', positionTooltip)
    return () => window.removeEventListener('resize', positionTooltip)
  }, [positionTooltip])

  // Navigate if step requires a route
  useEffect(() => {
    if (!active) return
    const currentStep = TOUR_STEPS[step]
    if (currentStep?.route && pathname !== currentStep.route) {
      router.push(currentStep.route)
    }
    // Delay to let the page render after navigation before positioning the tooltip
    const timer = setTimeout(positionTooltip, 500)
    return () => clearTimeout(timer)
  }, [active, step, pathname, router, positionTooltip])

  function transition(cb: () => void) {
    setFadeState('out')
    setTimeout(() => {
      cb()
      setFadeState('in')
    }, 200)
  }

  function next() {
    if (step >= TOUR_STEPS.length - 1) {
      endTour()
      return
    }
    transition(() => setStep(s => s + 1))
  }

  function prev() {
    if (step <= 0) return
    transition(() => setStep(s => s - 1))
  }

  function endTour() {
    setActive(false)
    setStep(0)
    localStorage.setItem('dealflow-tour-completed', 'true')
  }

  if (!active) return null

  const currentStep = TOUR_STEPS[step]
  const isCenter = currentStep.position === 'center' || !currentStep.target
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
      {/* Overlay with cutout */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onClick={endTour}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && !isCenter && (
              <rect
                x={highlightRect.left - 6}
                y={highlightRect.top - 6}
                width={highlightRect.width + 12}
                height={highlightRect.height + 12}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(5,14,36,0.5)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border glow */}
      {highlightRect && !isCenter && (
        <div
          style={{
            position: 'absolute',
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            borderRadius: 10,
            border: '2px solid rgba(37,99,235,0.5)',
            boxShadow: '0 0 20px rgba(37,99,235,0.25), 0 0 0 4px rgba(37,99,235,0.1)',
            pointerEvents: 'none',
            animation: 'tourPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        onClick={e => e.stopPropagation()}
        style={{
          position: isCenter ? 'fixed' : 'absolute',
          top: isCenter ? '50%' : tooltipPos.top,
          left: isCenter ? '50%' : tooltipPos.left,
          transform: isCenter ? 'translate(-50%, -50%)' : undefined,
          width: isCenter ? 480 : 360,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(5,14,36,0.2), 0 8px 24px rgba(5,14,36,0.1), 0 0 0 1px rgba(5,14,36,0.06)',
          fontFamily: F,
          opacity: fadeState === 'in' ? 1 : 0,
          transition: 'opacity 0.2s ease',
          zIndex: 10001,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(37,99,235,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}>
              {currentStep.icon}
            </div>
            <div>
              <div style={{
                fontSize: isCenter ? 20 : 15,
                fontWeight: 700,
                color: '#0B1224',
                letterSpacing: '-0.01em',
              }}>
                {currentStep.title}
              </div>
            </div>
          </div>
          <button
            onClick={endTour}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              color: 'rgba(5,14,36,0.3)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(5,14,36,0.05)'; e.currentTarget.style.color = 'rgba(5,14,36,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(5,14,36,0.3)' }}
            title="End tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '12px 20px 20px',
        }}>
          <p style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'rgba(5,14,36,0.55)',
            margin: '0 0 20px',
          }}>
            {currentStep.description}
          </p>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Step counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === step ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === step ? '#2563EB' : i < step ? 'rgba(37,99,235,0.3)' : 'rgba(5,14,36,0.1)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!isFirst && (
                <button
                  onClick={prev}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(5,14,36,0.1)',
                    background: '#fff',
                    color: '#0B1224',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: F,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(5,14,36,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                >
                  Back
                </button>
              )}
              <button
                onClick={isLast ? endTour : next}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563EB',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: F,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2563EB' }}
              >
                {isFirst ? 'Start Tour' : isLast ? 'Finish' : 'Next'}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Skip link */}
          {!isLast && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={endTour}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(5,14,36,0.25)',
                  fontSize: 12,
                  fontFamily: F,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(5,14,36,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(5,14,36,0.25)' }}
              >
                Skip tour
              </button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(37,99,235,0.25), 0 0 0 4px rgba(37,99,235,0.1); }
          50% { box-shadow: 0 0 30px rgba(37,99,235,0.35), 0 0 0 6px rgba(37,99,235,0.15); }
        }
      ` }} />
    </div>
  )
}
