'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Users, Loader2 } from 'lucide-react'
import BuyerMatches from './BuyerMatches'
import { useScrollLock } from '@/hooks/useScrollLock'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface BuyerMatchModalProps {
  dealId: string
  dealAddress?: string
  onClose: () => void
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

/* ═══════════════════════════════════════════════
   MODAL COMPONENT
   ═══════════════════════════════════════════════ */

/**
 * Slide-out panel / modal that displays buyer matches for a deal.
 * Can be triggered from anywhere a deal is shown.
 *
 * Usage:
 *   {showMatchModal && (
 *     <BuyerMatchModal
 *       dealId={deal.id}
 *       dealAddress={deal.address}
 *       onClose={() => setShowMatchModal(false)}
 *     />
 *   )}
 */
export default function BuyerMatchModal({ dealId, dealAddress, onClose }: BuyerMatchModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Lock body scroll when modal is open
  useScrollLock(true)

  // Animate in
  useEffect(() => {
    // Small delay for mount -> animate
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Close with animation
  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] transition-opacity duration-200"
        style={{
          background: 'rgba(0,0,0,0.3)',
          opacity: isVisible ? 1 : 0,
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-out panel (right side) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Find buyers${dealAddress ? ` for ${dealAddress}` : ''}`}
        className="fixed top-0 right-0 bottom-0 z-[201] flex flex-col w-full sm:max-w-[440px] shadow-2xl transition-transform duration-200 ease-out"
        style={{
          background: 'var(--dash-bg, #F9FAFB)',
          borderLeft: '1px solid var(--dash-card-border, rgba(0,0,0,0.06))',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          fontFamily: FONT,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            background: 'var(--dash-card, #fff)',
            borderBottom: '1px solid var(--dash-card-border, rgba(0,0,0,0.06))',
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-[0.92rem] font-semibold text-gray-900">
              <Users className="w-4 h-4 text-[#2563EB]" />
              Find Buyers
            </div>
            {dealAddress && (
              <div className="text-[0.74rem] text-gray-400 mt-0.5 truncate max-w-[320px]">
                {dealAddress}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            aria-label="Close panel"
            className="p-2.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent border-0 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-4">
            <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider">
              Top Matches
            </div>
            <div className="text-[0.68rem] text-gray-400 mt-0.5">
              Scored by market, price range, strategy, and buyer quality
            </div>
          </div>

          <BuyerMatches dealId={dealId} />
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-6 py-3 text-center"
          style={{
            background: 'var(--dash-card, #fff)',
            borderTop: '1px solid var(--dash-card-border, rgba(0,0,0,0.06))',
          }}
        >
          <div className="text-[0.68rem] text-gray-400">
            Showing top 10 matches out of all eligible buyers
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════
   TRIGGER BUTTON (convenience export)
   ═══════════════════════════════════════════════ */

/**
 * A "Find Buyers" button that opens the BuyerMatchModal when clicked.
 *
 * Usage:
 *   <FindBuyersButton dealId={deal.id} dealAddress={deal.address} />
 */
export function FindBuyersButton({
  dealId,
  dealAddress,
  className = '',
}: {
  dealId: string
  dealAddress?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className={`flex items-center gap-1.5 bg-[rgba(37,99,235,0.06)] hover:bg-[rgba(37,99,235,0.12)] text-[#2563EB] border-0 rounded-[8px] px-3.5 py-2 text-[0.78rem] font-medium cursor-pointer transition-colors ${className}`}
        style={{ fontFamily: FONT }}
      >
        <Users className="w-3.5 h-3.5" />
        Find Buyers
      </button>

      {open && (
        <BuyerMatchModal
          dealId={dealId}
          dealAddress={dealAddress}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
