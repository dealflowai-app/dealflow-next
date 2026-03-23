import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function GptLoading() {
  return (
    <div className="flex h-full" style={{ fontFamily: FONT }}>
      {/* History sidebar */}
      <div
        className="hidden lg:flex flex-col w-64 shrink-0 p-4 space-y-3"
        style={{
          background: 'var(--gray-50, #f9fafb)',
          borderRight: '1px solid var(--dash-card-border)',
        }}
      >
        <Skeleton variant="rect" className="h-9 w-full rounded-lg" />
        <Skeleton variant="text" className="h-3 w-20 mt-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-4 w-full" />
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-3"
          style={{ borderBottom: '1px solid var(--dash-card-border)' }}
        >
          <Skeleton variant="circle" className="h-8 w-8" />
          <Skeleton variant="text" className="h-5 w-28" />
        </div>

        {/* Messages area */}
        <div className="flex-1 p-6 space-y-6 overflow-hidden">
          {/* Welcome / empty state */}
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Skeleton variant="circle" className="h-16 w-16" />
            <Skeleton variant="text" className="h-6 w-48" />
            <Skeleton variant="text" className="h-3.5 w-72" />

            {/* Suggestion chips */}
            <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-md">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} className="!p-4 space-y-2">
                  <Skeleton variant="text" className="h-3.5 w-3/4" />
                  <Skeleton variant="text" className="h-3 w-full" />
                </SkeletonCard>
              ))}
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="px-6 pb-6">
          <div
            className="rounded-xl p-3 flex items-end gap-3"
            style={{
              background: 'var(--dash-card, #fff)',
              border: '1px solid var(--dash-card-border)',
            }}
          >
            <Skeleton variant="rect" className="h-10 flex-1 rounded-lg" />
            <Skeleton variant="circle" className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Context sidebar */}
      <div
        className="hidden xl:flex flex-col w-64 shrink-0 p-4 space-y-4"
        style={{
          background: 'var(--gray-50, #f9fafb)',
          borderLeft: '1px solid var(--dash-card-border)',
        }}
      >
        <Skeleton variant="text" className="h-4 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-2">
            <Skeleton variant="text" className="h-3.5 w-20" />
            <Skeleton variant="text" className="h-3 w-full" />
            <Skeleton variant="text" className="h-3 w-2/3" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}
