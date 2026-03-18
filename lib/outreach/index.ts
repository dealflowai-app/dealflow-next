// ─── Outreach Barrel Export ───────────────────────────────────────────────────
// All outreach functions should be imported from '@/lib/outreach'

export {
  checkCompliance,
  normalizePhone,
  invalidateDNCCache,
  getDNCSet,
  type ComplianceCheckResult,
  type ComplianceReason,
  type ComplianceWarning,
  type ComplianceChannel,
  type ComplianceCheckOptions,
} from './compliance'

export {
  processOptOut,
  processOptIn,
  importDNCList,
  getDNCList,
  type OptOutSource,
  type OptOutEntry,
} from './opt-out'

export {
  getTimezoneForState,
  getTimezoneForAreaCode,
  getRecipientTimezone,
  isWithinCallingHours,
  STATE_CALLING_HOURS,
} from './timezone-map'

export {
  buildAudience,
  validateBuyerIds,
  type AudienceFilter,
  type AudienceBuyer,
  type AudienceResult,
} from './audience-builder'

export {
  getBlandClient,
  toE164,
  type BlandCallRequest,
  type BlandCallResponse,
  type BlandCallStatus,
} from './bland-client'

export {
  generateScript,
  getAvailableTemplates,
  type ScriptConfig,
} from './scripts'

export {
  executeCampaignBatch,
  triggerNextBatch,
  type ExecutionResult,
} from './campaign-executor'

export {
  getSMSClient,
  sendBulkSMS,
  mergeTemplate,
  validateTwilioSignature,
  SMS_TEMPLATES,
  type SMSMessage,
  type SMSSendResult,
  type SMSTemplate,
} from './sms-service'

export {
  getEmailDripService,
  EMAIL_DRIP_SEQUENCES,
  type EmailDripStep,
  type EmailDripSequence,
  type EmailSendResult,
} from './email-service'

export {
  getNextChannelAction,
  buildMultiChannelConfig,
  DEFAULT_MULTI_CHANNEL_CONFIG,
  type MultiChannelConfig,
  type ChannelFallback,
  type ChannelAction,
  type OutreachChannel,
} from './multi-channel'

export {
  parseTranscript,
  searchTranscript,
  type TranscriptSegment,
  type SpeakerStats,
  type KeyMoment,
  type ParsedTranscript,
  type ParseOptions,
} from './transcript-processor'

export {
  runABTest,
  calculateMinSampleSize,
  compareFromCampaignStats,
  type ABTestResult,
  type ABTestInput,
} from './ab-stats'

export {
  getSystemTemplates,
  getSystemTemplate,
  isSystemTemplate,
  suggestTemplates,
  type SystemTemplate,
} from './campaign-templates'

export {
  analyzeBuyerCallPatterns,
  analyzeCallPatternsForAudience,
  getMarketDefaults,
  optimizeSchedule,
  autoRedistribute,
  prioritizeBuyersForDeal,
  parseCallbackTime,
  detectCallbackRequest,
  extractCallbackContext,
  processDueCallbacks,
  type BuyerCallWindow,
  type ScheduleOptimization,
  type RedistributionSuggestion,
} from './smart-scheduler'

export {
  getVoicemailTemplates,
  getVoicemailTemplate,
  isSystemVoicemailTemplate,
  mergeVoicemailTemplate,
  getDefaultVoicemailForScript,
  type VoicemailTemplate,
  type VoicemailMergeData,
} from './voicemail-templates'

export {
  getVoicemailForAttempt,
  resolveVoicemailText,
  buildVoicemailInstructions,
  buildMergeData,
  generateTTSAudio,
  updateVoicemailCallbackRates,
  type VoicemailRecordingConfig,
  type VoicemailDropResult,
  type BuyerMergeInfo,
} from './voicemail-service'

export {
  identifyCaller,
  type CallerIdentification,
} from './caller-id'

export {
  routeInboundCall,
  generateInboundScript,
  generateUnknownCallerScript,
  DEFAULT_INBOUND_CONFIG,
  type RoutingDecision,
  type InboundRoutingConfig,
} from './inbound-router'

export {
  classifyMessage,
  findOrCreateConversation,
  handleInboundMessage,
  sendManualMessage,
  setConversationMode,
  markConversationRead,
  recordOutboundCampaignSMS,
  mergeQuickReply,
  QUICK_REPLIES,
  type MessageClassification,
  type ConversationMode,
  type InboundMessageResult,
  type OutboundSendResult,
  type SMSQuickReply,
} from './sms-conversation'

export {
  analyzeConversation,
  analyzeSentiment,
  detectBuyingSignals,
  detectObjections,
  detectCompetitors,
  calculateTalkMetrics,
  assessEngagement,
  qualifiesForDeepAnalysis,
  generateDeepAnalysis,
  saveCallIntelligence,
  updateCallIntelligenceDeep,
  type ConversationAnalysis,
  type SentimentAnalysis,
  type BuyingSignal,
  type BuyingSignalAnalysis,
  type Objection,
  type ObjectionAnalysis,
  type CompetitorMention,
  type CompetitorAnalysis,
  type TalkMetricAnalysis,
  type EngagementAnalysis,
  type CallHighlight,
  type ScriptPerformanceAnalysis,
} from './conversation-intelligence'

export {
  getBlandCapabilities,
  resetCapabilitiesCache,
  type BlandCapabilities,
} from './bland-capabilities'

export {
  getActiveCalls,
  startMonitoring,
  stopMonitoring,
  sendWhisper,
  bargeIn,
  endCallRemotely,
  getLiveTranscript,
  getCallDetail,
  createLiveSession,
  completeLiveSession,
  type LiveCallInfo,
  type MonitoringSession,
  type WhisperResult,
  type BargeInResult,
} from './live-call-service'
