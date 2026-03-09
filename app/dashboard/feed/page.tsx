export default function FeedPage() {
  return (
    <div className="p-9 max-w-[1080px]">
      <div className="mb-8">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.7rem] font-extrabold text-gray-900 tracking-[-0.03em] mb-1.5"
        >
          Deal Feed
        </h1>
        <p className="text-[0.88rem] text-gray-500">
          Properties matched to your buy box criteria.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
          </svg>
        </div>
        <div
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="font-bold text-[0.9rem] text-gray-800 mb-1.5"
        >
          No deals yet
        </div>
        <div className="text-[0.82rem] text-gray-400 max-w-[340px] mx-auto">
          Set up your buy box and deals matching your criteria will appear here automatically.
        </div>
      </div>
    </div>
  )
}
