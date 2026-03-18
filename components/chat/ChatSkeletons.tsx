'use client'

// ── Skeleton building block ──────────────────────────────────────────────────

function Bar({ width = '100%', height = '10px' }: { width?: string; height?: string }) {
  return (
    <div
      className="bg-[#E5E7EB] rounded animate-pulse"
      style={{ width, height }}
    />
  )
}

// ── History Sidebar Skeleton ─────────────────────────────────────────────────

export function HistorySidebarSkeleton() {
  return (
    <div className="px-4 py-3 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar width="60%" height="10px" />
          <Bar width="85%" height="8px" />
          <Bar width="30%" height="8px" />
        </div>
      ))}
    </div>
  )
}

// ── Context Sidebar Skeleton ─────────────────────────────────────────────────

export function ContextSidebarSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Connected Data */}
      <div className="space-y-3">
        <Bar width="40%" height="10px" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-[#E5E7EB] animate-pulse flex-shrink-0" />
            <Bar width="50%" height="9px" />
            <div className="ml-auto">
              <Bar width="24px" height="9px" />
            </div>
          </div>
        ))}
      </div>
      {/* Recent Activity */}
      <div className="space-y-3">
        <Bar width="35%" height="10px" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB] animate-pulse flex-shrink-0" />
            <Bar width="70%" height="8px" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chat Loading Skeleton (for loading a conversation from URL) ──────────────

export function ChatLoadingSkeleton() {
  return (
    <div className="px-6 py-6 space-y-6">
      {Array.from({ length: 4 }).map((_, i) => {
        const isUser = i % 2 === 0
        return (
          <div key={i} className="flex gap-3">
            <div
              className={`w-8 h-8 rounded-lg animate-pulse flex-shrink-0 ${
                isUser ? 'bg-[#BFDBFE]' : 'bg-[#E5E7EB]'
              }`}
            />
            <div className="flex-1 space-y-2 pt-1">
              <Bar width={isUser ? '40%' : '90%'} height="10px" />
              {!isUser && (
                <>
                  <Bar width="80%" height="10px" />
                  <Bar width="60%" height="10px" />
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
