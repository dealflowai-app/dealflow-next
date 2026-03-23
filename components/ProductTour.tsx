'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, PhoneOutgoing,
  FolderOpen, FileSignature, Store,
  Sparkles, X, ChevronRight,
  Map, Rocket,
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
  // 1. Welcome modal
  {
    target: null,
    title: 'Welcome to DealFlow AI',
    description: "Let's take a quick 60-second tour so you can start closing deals faster. We'll show you exactly where to go first.",
    icon: <Rocket className="w-6 h-6" />,
    position: 'center',
  },
  // 2. Dashboard overview
  {
    target: '[data-tour="dashboard-content"]',
    title: 'Your Dashboard',
    description: 'Check your KPIs, revenue, and pipeline at a glance. Use the quick-action buttons to jump straight into your most common tasks.',
    icon: <LayoutDashboard className="w-5 h-5" />,
    position: 'left',
    route: '/dashboard',
  },
  // 3. Discovery
  {
    target: '[data-tour="discovery-content"]',
    title: 'Find Cash Buyers',
    description: 'Type a city or zip code to search for properties and cash buyers. Use the map and filters to zero in on your ideal leads, then import them to your CRM with one click.',
    icon: <Map className="w-5 h-5" />,
    position: 'bottom',
    route: '/discovery',
  },
  // 4. CRM
  {
    target: '[data-tour="crm-content"]',
    title: 'Manage Your Buyers',
    description: 'Add your first buyer or import leads from Discovery. Tag, score, and track every conversation so no deal slips through the cracks.',
    icon: <Users className="w-5 h-5" />,
    position: 'bottom',
    route: '/crm',
  },
  // 5. Outreach
  {
    target: '[data-tour="outreach-content"]',
    title: 'Launch Campaigns',
    description: 'Select buyers from your CRM and start an AI-powered calling, SMS, or email campaign. Every call is recorded and transcribed automatically.',
    icon: <PhoneOutgoing className="w-5 h-5" />,
    position: 'bottom',
    route: '/outreach',
  },
  // 6. My Deals
  {
    target: '[data-tour="deals-content"]',
    title: 'Track Your Deals',
    description: 'Add a property address to analyze comps, ARV, and profit potential. Track every active deal, match it to buyers, and monitor incoming offers.',
    icon: <FolderOpen className="w-5 h-5" />,
    position: 'bottom',
    route: '/deals',
  },
  // 7. Marketplace
  {
    target: '[data-tour="marketplace-content"]',
    title: 'Browse the Marketplace',
    description: 'List your deals for other wholesalers to see, or browse listings to find opportunities. Great for JV partnerships and moving inventory fast.',
    icon: <Store className="w-5 h-5" />,
    position: 'bottom',
    route: '/marketplace',
  },
  // 8. Contracts
  {
    target: '[data-tour="contracts-content"]',
    title: 'Send Contracts',
    description: 'Create assignment contracts that auto-fill from your deal data. Pick a state-specific template, customize it, and send for e-signature in minutes.',
    icon: <FileSignature className="w-5 h-5" />,
    position: 'bottom',
    route: '/contracts',
  },
  // 9. Ask AI
  {
    target: '[data-tour="ask-ai-btn"]',
    title: 'Ask AI Anything',
    description: 'Stuck on a deal? Click here to chat with your AI assistant. It knows your buyers, deals, and campaigns and can help with pricing, strategy, and next steps.',
    icon: <Sparkles className="w-5 h-5" />,
    position: 'bottom',
    route: '/dashboard',
  },
  // 10. Finish
  {
    target: null,
    title: "You're Ready to Go!",
    description: "Your dashboard has demo data so you can explore everything risk-free. When you're ready, clear the demo from the banner at the top and start adding real deals.",
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

  // Determine if we have a valid highlight (element found on page)
  const hasHighlight = highlightRect !== null && !isCenter

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
      {/* Overlay with cutout for highlighted element */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasHighlight && (
              <rect
                x={highlightRect!.left - 6}
                y={highlightRect!.top - 6}
                width={highlightRect!.width + 12}
                height={highlightRect!.height + 12}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(5,14,36,0.55)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Clickable backdrop to dismiss tour */}
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
        onClick={endTour}
      />

      {/* Highlight border glow around the target element */}
      {hasHighlight && (
        <div
          style={{
            position: 'fixed',
            top: highlightRect!.top - 6,
            left: highlightRect!.left - 6,
            width: highlightRect!.width + 12,
            height: highlightRect!.height + 12,
            borderRadius: 10,
            border: '2px solid rgba(37,99,235,0.5)',
            boxShadow: '0 0 20px rgba(37,99,235,0.25), 0 0 0 4px rgba(37,99,235,0.1)',
            pointerEvents: 'none',
            animation: 'tourPulse 2s ease-in-out infinite',
            zIndex: 10001,
          }}
        />
      )}

      {/* Card - always centered on screen as a modal */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10002,
        }}
      >
        <div
          ref={tooltipRef}
          onClick={e => e.stopPropagation()}
          style={{
            pointerEvents: 'auto',
            width: 420,
            maxWidth: 'calc(100vw - 40px)',
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 24px 80px rgba(5,14,36,0.22), 0 8px 24px rgba(5,14,36,0.12), 0 0 0 1px rgba(5,14,36,0.06)',
            fontFamily: F,
            opacity: fadeState === 'in' ? 1 : 0,
            transform: fadeState === 'in' ? 'scale(1)' : 'scale(0.97)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            overflow: 'hidden',
          }}
        >
          {/* Header accent bar */}
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, #2563EB ${((step + 1) / TOUR_STEPS.length) * 100}%, rgba(37,99,235,0.1) ${((step + 1) / TOUR_STEPS.length) * 100}%)`,
            transition: 'background 0.3s ease',
          }} />

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(37,99,235,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                flexShrink: 0,
              }}>
                {currentStep.icon}
              </div>
              <div style={{
                fontSize: isCenter ? 20 : 16,
                fontWeight: 700,
                color: '#0B1224',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
              }}>
                {currentStep.title}
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
                flexShrink: 0,
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
            padding: '14px 24px 24px',
          }}>
            <p style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(5,14,36,0.55)',
              margin: '0 0 24px',
            }}>
              {currentStep.description}
            </p>

            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              {/* Step dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: i === step ? '#2563EB' : i < step ? 'rgba(37,99,235,0.35)' : 'rgba(5,14,36,0.1)',
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
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid rgba(5,14,36,0.12)',
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
                    padding: '8px 20px',
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
                    gap: 5,
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
              <div style={{ textAlign: 'center', marginTop: 14 }}>
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
