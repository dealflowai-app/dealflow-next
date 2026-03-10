export default function BuyerBoxPage() {
  return (
    <div className="p-9 max-w-[800px]">
      <div className="mb-8">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.45rem] font-medium text-gray-900 tracking-[-0.025em] mb-1"
        >
          Buy Box
        </h1>
        <p className="text-[0.85rem] text-gray-400">
          Define your investment criteria to receive matched deals.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg py-16 px-6 text-center">
        <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
        </div>
        <div className="text-[0.88rem] text-gray-700 mb-2">
          Coming soon
        </div>
        <div className="text-[0.82rem] text-gray-400 max-w-[300px] mx-auto">
          Set target markets, price ranges, property types, and deal criteria here.
        </div>
      </div>
    </div>
  )
}
