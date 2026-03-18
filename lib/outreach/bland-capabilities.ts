// ─── Bland AI Capability Checker ────────────────────────────────────────────
// Feature gates for Bland AI enterprise capabilities. The live monitor UI
// degrades gracefully when enterprise features are unavailable.

export interface BlandCapabilities {
  liveAudioStream: boolean       // can we get real-time audio via WebSocket?
  liveTranscript: boolean        // can we get real-time transcript via polling?
  whisperInjection: boolean      // can we inject prompts mid-call?
  callTransfer: boolean          // can we transfer to another number?
  inboundCalls: boolean          // can Bland handle inbound?
}

let _cached: BlandCapabilities | null = null

export function getBlandCapabilities(): BlandCapabilities {
  if (_cached) return _cached

  const isEnterprise = process.env.BLAND_ENTERPRISE === 'true'
  const hasApiKey = !!process.env.BLAND_API_KEY

  _cached = {
    // Enterprise-only features
    liveAudioStream: isEnterprise,
    whisperInjection: isEnterprise,
    callTransfer: isEnterprise,
    inboundCalls: isEnterprise,
    // Available to all plans with an API key — polling-based transcript
    liveTranscript: hasApiKey,
  }

  return _cached
}

/** Reset cache (useful for testing) */
export function resetCapabilitiesCache(): void {
  _cached = null
}
