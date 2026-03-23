import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function OutreachLoading() {
  return (
    <div className="p-6 space-y-6" style={{ fontFamily: FONT }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-7 w-32" />
        <Skeleton variant="rect" className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="space-y-2">
              <Skeleton variant="text" className="h-3 w-20" />
              <Skeleton variant="text" className="h-7 w-16" />
              <Skeleton variant="text" className="h-3 w-12" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Campaign list */}
      <SkeletonCard className="!p-0 overflow-hidden">
        {/* List header */}
        <div
          className="flex items-center gap-4 px-5 py-3"
          style={{ borderBottom: '1px solid var(--dash-card-border)' }}
        >
          <Skeleton variant="text" className="h-3.5 w-40" />
          <Skeleton variant="text" className="h-3.5 w-16 ml-auto" />
          <Skeleton variant="text" className="h-3.5 w-16" />
          <Skeleton variant="text" className="h-3.5 w-16" />
          <Skeleton variant="text" className="h-3.5 w-16" />
        </div>

        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{
              borderBottom:
                i < 4 ? '1px solid var(--dash-card-border)' : 'none',
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton variant="text" className="h-4 w-48" />
              <Skeleton variant="text" className="h-3 w-32" />
            </div>
            <Skeleton variant="rect" className="h-5 w-16 rounded-full" />
            <Skeleton variant="text" className="h-3.5 w-12" />
            <Skeleton variant="text" className="h-3.5 w-12" />
            <Skeleton variant="text" className="h-3.5 w-12" />
            <Skeleton variant="circle" className="h-7 w-7" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}
