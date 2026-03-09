export default function BuyerBoxPage() {
  return (
    <div className="p-9 max-w-[800px]">
      <div className="mb-8">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.7rem] font-extrabold text-gray-900 tracking-[-0.03em] mb-1.5"
        >
          Buy Box
        </h1>
        <p className="text-[0.88rem] text-gray-500">
          Define your investment criteria so we can match the right deals to you.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
        </div>
        <div
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="font-bold text-[0.9rem] text-gray-800 mb-1.5"
        >
          Buy box setup coming soon
        </div>
        <div className="text-[0.82rem] text-gray-400 max-w-[320px] mx-auto">
          You&apos;ll be able to set target markets, price ranges, property types, and deal criteria here.
        </div>
      </div>
    </div>
  )
}
