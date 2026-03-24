'use client'

// ─── REUSABLE SKELETON PRIMITIVES ────────────────────────────────────────────

const shimmer = 'animate-pulse bg-[rgba(5,14,36,0.04)]'

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`${shimmer} rounded ${className}`} style={style} />
}

// ─── SKELETON VARIANTS ─────────────────────────────────────────────────────

/** KPI card skeleton — used on dashboard */
export function KPISkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[rgba(5,14,36,0.06)] p-5">
          <Bone className="h-3 w-20 mb-3" />
          <Bone className="h-7 w-28 mb-2" />
          <Bone className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Table skeleton — rows with columns */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-[rgba(5,14,36,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(5,14,36,0.06)]">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-3 flex-1" style={{ maxWidth: i === 0 ? 180 : 100 } as React.CSSProperties} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[rgba(5,14,36,0.03)] last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Bone key={j} className={`h-4 flex-1 ${j === 0 ? 'max-w-[180px]' : 'max-w-[100px]'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Card grid skeleton — used for listings, buyer board, CRM cards */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[rgba(5,14,36,0.06)] p-5">
          <div className="flex items-center gap-3 mb-4">
            <Bone className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <Bone className="h-4 w-32 mb-2" />
              <Bone className="h-3 w-20" />
            </div>
          </div>
          <Bone className="h-3 w-full mb-2" />
          <Bone className="h-3 w-3/4 mb-4" />
          <div className="flex gap-2">
            <Bone className="h-6 w-16 rounded-full" />
            <Bone className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Pipeline skeleton — kanban-style columns */
export function PipelineSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 mb-6">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="flex-1 bg-white rounded-xl border border-[rgba(5,14,36,0.06)] p-4">
          <Bone className="h-4 w-24 mb-1" />
          <Bone className="h-6 w-10 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
              <Bone key={j} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Chat skeleton — message list */
export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-4">
        {[true, false, true, false, true].map((isUser, i) => (
          <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <Bone className={`h-12 rounded-2xl ${isUser ? 'w-2/5' : 'w-3/5'}`} />
          </div>
        ))}
      </div>
      <div className="border-t border-[rgba(5,14,36,0.06)] p-4">
        <Bone className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}

/** Map + list skeleton — split view for discovery */
export function MapListSkeleton() {
  return (
    <div className="flex h-full">
      <div className="flex-1">
        <Bone className="w-full h-full rounded-none" />
      </div>
      <div className="w-[400px] border-l border-[rgba(5,14,36,0.06)] p-4 space-y-3">
        <Bone className="h-10 w-full rounded-lg mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 border border-[rgba(5,14,36,0.04)] rounded-lg">
            <Bone className="w-16 h-16 rounded flex-shrink-0" />
            <div className="flex-1">
              <Bone className="h-4 w-3/4 mb-2" />
              <Bone className="h-3 w-1/2 mb-1" />
              <Bone className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Dashboard skeleton — full page with KPIs, chart, and activity */
export function DashboardSkeleton() {
  return (
    <div className="p-6">
      <Bone className="h-7 w-48 mb-6" />
      <KPISkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[rgba(5,14,36,0.06)] p-5">
          <Bone className="h-4 w-32 mb-4" />
          <Bone className="h-48 w-full rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-[rgba(5,14,36,0.06)] p-5">
          <Bone className="h-4 w-28 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Bone className="h-3 w-full mb-1" />
                  <Bone className="h-2 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Generic page skeleton with header + filter bar + content */
export function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-7 w-48" />
        <Bone className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex items-center gap-3 mb-5">
        <Bone className="h-9 w-64 rounded-lg" />
        <Bone className="h-9 w-24 rounded-lg" />
        <Bone className="h-9 w-24 rounded-lg" />
      </div>
      {children || <TableSkeleton />}
    </div>
  )
}
