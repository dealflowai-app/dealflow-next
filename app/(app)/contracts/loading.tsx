import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function ContractsLoading() {
  return (
    <div className="p-6 space-y-5" style={{ fontFamily: FONT }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-7 w-32" />
        <Skeleton variant="rect" className="h-9 w-36 rounded-lg" />
      </div>

      {/* Tabs / filter */}
      <div className="flex items-center gap-3">
        <Skeleton variant="rect" className="h-9 flex-1 max-w-sm rounded-lg" />
        <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
      </div>

      {/* Contract list */}
      <SkeletonCard className="!p-0 overflow-hidden">
        {/* Table header */}
        <div
          className="flex items-center gap-4 px-5 py-3"
          style={{ borderBottom: '1px solid var(--dash-card-border)' }}
        >
          <Skeleton variant="text" className="h-3.5 w-36" />
          <Skeleton variant="text" className="h-3.5 w-24" />
          <Skeleton variant="text" className="h-3.5 w-20 ml-auto" />
          <Skeleton variant="text" className="h-3.5 w-20" />
          <Skeleton variant="text" className="h-3.5 w-16" />
        </div>

        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{
              borderBottom:
                i < 6 ? '1px solid var(--dash-card-border)' : 'none',
            }}
          >
            <Skeleton variant="circle" className="h-9 w-9" />
            <div className="flex-1 space-y-1.5">
              <Skeleton variant="text" className="h-4 w-52" />
              <Skeleton variant="text" className="h-3 w-36" />
            </div>
            <Skeleton variant="rect" className="h-5 w-20 rounded-full" />
            <Skeleton variant="text" className="h-3.5 w-20" />
            <Skeleton variant="text" className="h-3.5 w-20" />
            <Skeleton variant="circle" className="h-7 w-7" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}
