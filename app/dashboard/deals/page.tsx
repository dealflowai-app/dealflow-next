import Link from 'next/link'

export default function DealsPage() {
  return (
    <div className="p-9 max-w-[1080px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            className="text-[1.45rem] font-medium text-gray-900 tracking-[-0.025em] mb-1"
          >
            My Deals
          </h1>
          <p className="text-[0.85rem] text-gray-400">Manage and track submitted properties.</p>
        </div>
        <Link
          href="/dashboard/deals/new"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-md px-3.5 py-2 text-[0.84rem] no-underline hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New deal
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid px-5 py-3 border-b border-gray-100 bg-gray-50 deal-table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px' }}>
          {['Property', 'Price', 'Matches', 'Status', ''].map(h => (
            <div key={h} className="text-[0.68rem] text-gray-400 tracking-wide uppercase">{h}</div>
          ))}
        </div>

        {/* Empty */}
        <div className="py-16 px-6 text-center">
          <div className="text-[0.84rem] text-gray-400 mb-5 max-w-[340px] mx-auto">
            No deals yet. Submit a property and the AI will start finding matched cash buyers.
          </div>
          <Link
            href="/dashboard/deals/new"
            className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 rounded-md px-4 py-2 text-[0.84rem] no-underline hover:bg-gray-50 transition-colors"
          >
            Submit your first deal
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) { .deal-table-header { display: none !important; } }
      `}</style>
    </div>
  )
}
