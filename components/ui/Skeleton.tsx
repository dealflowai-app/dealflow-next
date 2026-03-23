'use client'

import { type CSSProperties } from 'react'

/* ═══════════════════════════════════════════════════════════
   Skeleton – reusable shimmer loader
   ═══════════════════════════════════════════════════════════ */

type Variant = 'text' | 'circle' | 'rect' | 'card'

interface SkeletonProps {
  variant?: Variant
  className?: string
  style?: CSSProperties
  /** Number of repeated skeleton items */
  count?: number
  /** Gap between items when count > 1 */
  gap?: number
}

const BASE =
  'animate-pulse rounded-md'

const variantStyles: Record<Variant, string> = {
  text: `${BASE} h-4 w-full rounded`,
  circle: `${BASE} rounded-full shrink-0`,
  rect: `${BASE} w-full`,
  card: `${BASE} w-full rounded-[var(--dash-card-radius,10px)]`,
}

/**
 * Skeleton placeholder with pulse animation.
 *
 * Uses the app's CSS-variable palette so it automatically
 * adapts to `.dark` mode via `--gray-200` / `--gray-100`.
 */
export default function Skeleton({
  variant = 'rect',
  className = '',
  style,
  count = 1,
  gap = 8,
}: SkeletonProps) {
  const baseStyle: CSSProperties = {
    background: 'var(--gray-200, #e5e7eb)',
    ...style,
  }

  if (count > 1) {
    return (
      <div className="flex flex-col" style={{ gap }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${variantStyles[variant]} ${className}`}
            style={baseStyle}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${variantStyles[variant]} ${className}`}
      style={baseStyle}
    />
  )
}

/* ───────── Convenience sub-components ───────── */

export function SkeletonCard({
  className = '',
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-[var(--dash-card-radius,10px)] p-5 ${className}`}
      style={{
        background: 'var(--dash-card, #fff)',
        border: '1px solid var(--dash-card-border, rgba(0,0,0,.08))',
      }}
    >
      {children}
    </div>
  )
}

export function SkeletonRow({
  className = '',
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>{children}</div>
  )
}
