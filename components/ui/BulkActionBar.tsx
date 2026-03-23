'use client'

import { type ReactNode } from 'react'

export interface BulkAction {
  label: string
  icon?: ReactNode
  onClick: (selectedIds: string[]) => void
  variant?: 'default' | 'danger'
}

interface BulkActionBarProps {
  selectedIds: string[]
  actions: BulkAction[]
  onClearSelection: () => void
}

export default function BulkActionBar({
  selectedIds,
  actions,
  onClearSelection,
}: BulkActionBarProps) {
  if (selectedIds.length === 0) return null

  return (
    <>
      {/* Keyframe animation injected once */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bulkBarSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      ` }} />

      <div
        className="fixed bottom-6 left-1/2 z-[90] flex items-center gap-3 rounded-[12px] px-5 py-3 shadow-2xl"
        style={{
          transform: 'translateX(-50%)',
          animation: 'bulkBarSlideUp 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
          background: '#0B1224',
          border: '1px solid rgba(255,255,255,0.08)',
          fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        }}
      >
        {/* Count */}
        <span
          className="text-white text-[0.82rem] font-semibold whitespace-nowrap"
          style={{ letterSpacing: '-0.01em' }}
        >
          {selectedIds.length} selected
        </span>

        {/* Divider */}
        <div className="w-px h-5 bg-white/15" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {actions.map((action) => {
            const isDanger = action.variant === 'danger'
            return (
              <button
                key={action.label}
                onClick={() => action.onClick(selectedIds)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.78rem] font-medium border-0 cursor-pointer transition-all whitespace-nowrap ${
                  isDanger
                    ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                style={{ background: 'transparent' }}
              >
                {action.icon && <span className="flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{action.icon}</span>}
                {action.label}
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/15" />

        {/* Clear selection link */}
        <button
          onClick={onClearSelection}
          className="text-white/50 hover:text-white/80 text-[0.76rem] bg-transparent border-0 cursor-pointer transition-colors whitespace-nowrap"
        >
          Clear selection
        </button>
      </div>
    </>
  )
}
