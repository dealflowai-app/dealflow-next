export default function FeedPage() {
  return (
    <div className="p-9 max-w-[1080px]">
      <div className="mb-8">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.45rem] font-medium text-gray-900 tracking-[-0.025em] mb-1"
        >
          Deal Feed
        </h1>
        <p className="text-[0.85rem] text-gray-400">
          Properties matched to your buy box criteria.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg py-16 px-6 text-center">
        <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
          </svg>
        </div>
        <div className="text-[0.84rem] text-gray-400 mb-5 max-w-[340px] mx-auto">
          Set up your buy box and matched deals will appear here automatically.
        </div>
      </div>
    </div>
  )
}
