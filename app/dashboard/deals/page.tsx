import Link from 'next/link'

export default function DealsPage() {
  return (
    <div className="p-9 max-w-[1080px]">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            className="text-[1.7rem] font-extrabold text-gray-900 tracking-[-0.03em] mb-1.5"
          >
            My Deals
          </h1>
          <p className="text-[0.88rem] text-gray-500">
            Manage and track all your submitted properties.
          </p>
        </div>
        <Link
          href="/dashboard/deals/new"
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-[10px] px-4 py-2.5 text-[0.875rem] font-bold no-underline flex-shrink-0 shadow-sm hover:bg-blue-700 transition-colors"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Deal
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid px-6 py-3 border-b border-gray-100 bg-gray-50 deal-table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 100px' }}>
          {['Property', 'Price', 'Matches', 'Status', ''].map(h => (
            <div key={h} className="text-[0.68rem] font-bold tracking-[0.06em] uppercase text-gray-400">{h}</div>
          ))}
        </div>

        {/* Empty */}
        <div className="py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            className="font-bold text-[0.9rem] text-gray-800 mb-1.5"
          >
            No deals submitted yet
          </div>
          <div className="text-[0.82rem] text-gray-400 mb-6 max-w-[340px] mx-auto">
            Submit your first property and our AI will immediately start finding and calling matched cash buyers.
          </div>
          <Link
            href="/dashboard/deals/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-[9px] px-4 py-2.5 text-[0.875rem] font-bold no-underline"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
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
