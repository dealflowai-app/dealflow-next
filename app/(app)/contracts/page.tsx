'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/components/toast'
import {
  Plus,
  FileSignature,
  FileText,
  Archive,
  Search,
  ArrowLeft,
  X,
  Clock,
  CheckCircle2,
  Send,
  Bell,
  Pencil,
  Ban,
  Download,
  Phone,
  Mail,
  Calendar,
  Eye,
  ChevronDown,
  Loader2,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  History,
  FileDown,
  Layers,
  ArrowRight,
  Timer,
  Shield,
  Copy,
  GitCompare,
  RotateCcw,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface ContractRow {
  id: string
  status: 'DRAFT' | 'SENT' | 'EXECUTED' | 'VOIDED'
  templateName: string
  filledData: Record<string, string> | null
  documentUrl: string | null
  createdAt: string
  updatedAt: string
  sellerSignedAt: string | null
  buyerSignedAt: string | null
  voidedAt: string | null
  voidReason: string | null
  deal: {
    address: string
    city: string
    state: string
    zip: string
    askingPrice?: number
    status?: string
  }
  offer: {
    amount: number
    status: string
    terms?: string | null
    buyer?: {
      firstName: string
      lastName: string
      entityName: string | null
      email: string | null
      phone: string | null
    }
  } | null
  // Computed fields from API
  daysInCurrentStatus?: number
  isExpiringSoon?: boolean
  daysUntilClosing?: number | null
  hasLinkedContracts?: boolean
}

interface ContractDetailData extends ContractRow {
  contractHistory?: {
    id: string
    status: string
    templateName: string
    createdAt: string
    voidedAt: string | null
  }[]
  missingFieldCount?: number
}

interface TemplateField {
  key: string
  label: string
  type: string
  required: boolean
  source?: string
}

interface TemplateSection {
  heading: string
  body: string
}

interface TemplateRow {
  id: string
  name: string
  state: string
  type: string
  version: string
  fieldCount: number
  fields?: TemplateField[]
  sections?: TemplateSection[]
}

interface ContractVersionRow {
  id: string
  version: number
  changeType: string
  changeSummary: string | null
  changedFields: string[]
  documentUrl: string | null
  changedBy: string
  createdAt: string
}

interface VersionDiffItem {
  field: string
  oldValue: unknown
  newValue: unknown
}

interface DealOption {
  id: string
  address: string
  city: string
  state: string
  zip: string
  askingPrice: number
  status: string
}

interface BuyerOption {
  id: string
  firstName: string
  lastName: string
  entityName: string | null
  email: string | null
  phone: string | null
}

/* ═══════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════ */
const tabs = [
  { key: 'active', label: 'Active Contracts', icon: FileSignature },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'archive', label: 'Archive', icon: Archive },
] as const
type Tab = (typeof tabs)[number]['key']

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
const stages = ['Draft', 'Sent', 'Executed']

function stageIndex(status: string): number {
  switch (status) {
    case 'DRAFT': return 0
    case 'SENT': return 1
    case 'EXECUTED': return 2
    default: return 0
  }
}

function contractTypeLabel(templateName: string): string {
  if (templateName.toLowerCase().includes('double close')) return 'Double Close'
  if (templateName.toLowerCase().includes('jv') || templateName.toLowerCase().includes('joint venture')) return 'JV Agreement'
  return 'Assignment'
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function displayName(contract: ContractRow): string {
  if (contract.offer?.buyer) {
    const b = contract.offer.buyer
    if (b.entityName) return b.entityName
    return [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Buyer'
  }
  const fd = contract.filledData
  if (fd?.assignee_name) return fd.assignee_name
  if (fd?.buyer_name) return fd.buyer_name
  if (fd?.assigneeName) return fd.assigneeName
  return 'Buyer'
}

function buyerEmail(contract: ContractRow): string | null {
  if (contract.offer?.buyer?.email) return contract.offer.buyer.email
  return contract.filledData?.assignee_email || contract.filledData?.assigneeEmail || null
}

function buyerPhone(contract: ContractRow): string | null {
  if (contract.offer?.buyer?.phone) return contract.offer.buyer.phone
  return contract.filledData?.assignee_phone || contract.filledData?.assigneePhone || null
}

function feeFromContract(contract: ContractRow): number | null {
  const fd = contract.filledData
  if (fd?.assignment_fee) {
    const n = parseFloat(fd.assignment_fee.replace(/[^0-9.]/g, ''))
    if (!isNaN(n)) return n
  }
  if (fd?.assignmentFee) {
    const n = parseFloat(fd.assignmentFee.replace(/[^0-9.]/g, ''))
    if (!isNaN(n)) return n
  }
  return contract.offer?.amount ?? null
}

function contractTypeBadge(_t: string) {
  return 'text-[#6B7280] bg-[#F3F4F6]'
}

function archiveStatusStyle(s: string) {
  switch (s) {
    case 'EXECUTED': return 'text-emerald-700 bg-emerald-50'
    case 'VOIDED': return 'text-red-700 bg-red-50'
    default: return 'text-[#6B7280] bg-gray-100'
  }
}

function urgencyBadge(contract: ContractRow): { label: string; color: string } | null {
  if (contract.isExpiringSoon && contract.daysUntilClosing !== null && contract.daysUntilClosing !== undefined) {
    if (contract.daysUntilClosing <= 3) return { label: `Closing in ${contract.daysUntilClosing}d`, color: 'text-red-700 bg-red-50 border-red-200' }
    return { label: `Closing in ${contract.daysUntilClosing}d`, color: 'text-amber-700 bg-amber-50 border-amber-200' }
  }
  return null
}

/* ═══════════════════════════════════════════════
   PIPELINE VIEW
   ═══════════════════════════════════════════════ */
function PipelineView({
  contracts,
  activeFilter,
  onFilterChange,
}: {
  contracts: ContractRow[]
  activeFilter: string | null
  onFilterChange: (status: string | null) => void
}) {
  const statusCounts = useMemo(() => {
    const counts = { DRAFT: 0, SENT: 0, EXECUTED: 0, VOIDED: 0 }
    for (const c of contracts) {
      if (c.status in counts) counts[c.status as keyof typeof counts]++
    }
    return counts
  }, [contracts])

  const pipelineStages = [
    { key: 'DRAFT', label: 'Draft', count: statusCounts.DRAFT, color: 'bg-gray-100 text-gray-700 border-gray-300', activeColor: 'bg-gray-700 text-white', icon: Pencil },
    { key: 'SENT', label: 'Sent', count: statusCounts.SENT, color: 'bg-blue-50 text-blue-700 border-blue-300', activeColor: 'bg-blue-600 text-white', icon: Send },
    { key: 'EXECUTED', label: 'Executed', count: statusCounts.EXECUTED, color: 'bg-emerald-50 text-emerald-700 border-emerald-300', activeColor: 'bg-emerald-600 text-white', icon: CheckCircle2 },
    { key: 'VOIDED', label: 'Voided', count: statusCounts.VOIDED, color: 'bg-red-50 text-red-700 border-red-300', activeColor: 'bg-red-600 text-white', icon: Ban },
  ]

  return (
    <div className="flex items-stretch gap-0 mb-5">
      {pipelineStages.map((stage, i) => {
        const Icon = stage.icon
        const isActive = activeFilter === stage.key
        return (
          <button
            key={stage.key}
            onClick={() => onFilterChange(isActive ? null : stage.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-[0.82rem] font-medium cursor-pointer border transition-all ${
              isActive ? stage.activeColor : stage.color
            } ${i === 0 ? 'rounded-l-lg' : ''} ${i === pipelineStages.length - 1 ? 'rounded-r-lg' : ''} ${!isActive ? 'hover:opacity-80' : ''}`}
            style={{ borderRight: i < pipelineStages.length - 1 ? 'none' : undefined }}
          >
            <Icon className="w-4 h-4" />
            <span>{stage.label}</span>
            <span className={`text-[0.72rem] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-black/5'}`}>
              {stage.count}
            </span>
            {i < pipelineStages.length - 1 && !isActive && (
              <ArrowRight className="w-3 h-3 ml-1 opacity-30" />
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PROGRESS TRACKER
   ═══════════════════════════════════════════════ */
function ProgressTracker({ currentStage }: { currentStage: number }) {
  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => {
        const done = i < currentStage
        const active = i === currentStage
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.5rem] font-bold border-2 ${
                done ? 'bg-[#2563EB] border-[#2563EB] text-white' :
                active ? 'bg-white border-[#2563EB] text-[#2563EB]' :
                'bg-white border-gray-200 text-gray-300'
              }`}>
                {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[0.56rem] mt-1 whitespace-nowrap max-w-[60px] text-center leading-tight ${
                done ? 'text-[#2563EB] font-medium' :
                active ? 'text-[#2563EB] font-medium' :
                'text-gray-300'
              }`}>
                {s}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={`w-6 h-0.5 mx-0.5 mt-[-12px] ${done ? 'bg-[#2563EB]' : ''}`}
                style={!done ? { backgroundImage: 'repeating-linear-gradient(90deg, #d1d5db 0, #d1d5db 3px, transparent 3px, transparent 6px)', height: '2px' } : undefined}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════ */
function ContractSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="h-4 w-64 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
            <div className="h-8 w-24 bg-gray-100 rounded" />
          </div>
          <div className="h-6 w-full bg-gray-50 rounded" />
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SEND CONTRACT DIALOG
   ═══════════════════════════════════════════════ */
function SendContractDialog({
  contract,
  onClose,
  onConfirm,
}: {
  contract: ContractRow
  onClose: () => void
  onConfirm: () => void
}) {
  const email = buyerEmail(contract)
  const name = displayName(contract)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[440px] p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Send className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h3 className="text-[1rem] font-medium text-[#374151]">Send Contract</h3>
            <p className="text-[0.78rem] text-[#9CA3AF]">Notify buyer that contract is ready</p>
          </div>
        </div>

        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 mb-4">
          <div className="text-[0.78rem] text-[#374151] mb-2">
            <strong>Property:</strong> {contract.deal.address}, {contract.deal.city} {contract.deal.state}
          </div>
          <div className="text-[0.78rem] text-[#374151] mb-2">
            <strong>Buyer:</strong> {name}
          </div>
          {email && (
            <div className="flex items-center gap-1.5 text-[0.78rem] text-[#374151]">
              <Mail className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <strong>Email:</strong> {email}
            </div>
          )}
          {!email && (
            <div className="flex items-center gap-1.5 text-[0.78rem] text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              No email on file — contract will be marked as Sent for manual delivery.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[0.82rem] font-medium text-[#6B7280] hover:text-[#374151] bg-transparent border-0 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md text-[0.82rem] font-medium cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" /> Confirm & Send
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ACTIVE CONTRACTS
   ═══════════════════════════════════════════════ */
function ActiveContractsSection({
  contracts,
  loading,
  pipelineFilter,
  onViewDetail,
  onStatusChange,
  onSendContract,
}: {
  contracts: ContractRow[]
  loading: boolean
  pipelineFilter: string | null
  onViewDetail: (id: string) => void
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => void
  onSendContract: (contract: ContractRow) => void
}) {
  if (loading) return <ContractSkeleton />

  const active = pipelineFilter
    ? contracts.filter(c => c.status === pipelineFilter)
    : contracts.filter(c => c.status === 'DRAFT' || c.status === 'SENT')

  if (active.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-12 text-center">
        <FileSignature className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-[0.9rem] text-[#6B7280] mb-1">
          {pipelineFilter ? `No ${pipelineFilter.toLowerCase()} contracts` : 'No active contracts'}
        </p>
        <p className="text-[0.78rem] text-[#9CA3AF]">Create a contract from a deal to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {active.map(c => {
        const stage = stageIndex(c.status)
        const typeLabel = contractTypeLabel(c.templateName)
        const fee = feeFromContract(c)
        const buyer = displayName(c)
        const urgency = urgencyBadge(c)
        const offerAmount = c.offer?.amount

        return (
          <div key={c.id} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 hover:bg-[#F9FAFB] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h3 className="text-[0.9rem] font-medium text-[#374151]">
                    {c.deal.address}, {c.deal.city} {c.deal.state}
                  </h3>
                  <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${contractTypeBadge(typeLabel)}`}>{typeLabel}</span>
                  {urgency && (
                    <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full border ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  )}
                  {c.hasLinkedContracts && (
                    <span className="text-[0.66rem] font-medium px-2 py-0.5 rounded-full text-violet-700 bg-violet-50 border border-violet-200 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Linked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[0.76rem] text-[#9CA3AF] flex-wrap">
                  <span>Buyer: <strong className="text-[#374151]">{buyer}</strong></span>
                  {offerAmount && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>Offer: <strong className="text-[#374151]">${offerAmount.toLocaleString()}</strong></span>
                    </>
                  )}
                  {fee !== null && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>Fee: <strong className="text-[#2563EB]">${fee.toLocaleString()}</strong></span>
                    </>
                  )}
                  {c.daysInCurrentStatus !== undefined && c.daysInCurrentStatus > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {c.daysInCurrentStatus}d in {c.status.toLowerCase()}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                <button
                  onClick={() => onViewDetail(c.id)}
                  title="View details"
                  className="p-2 rounded-md text-[#2563EB] hover:bg-blue-50 bg-transparent border-0 cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {c.status === 'DRAFT' && (
                  <button
                    onClick={() => onSendContract(c)}
                    title="Send contract"
                    className="p-2 rounded-md text-emerald-600 hover:bg-emerald-50 bg-transparent border-0 cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                {c.status === 'SENT' && (
                  <button
                    onClick={() => onStatusChange(c.id, 'EXECUTED')}
                    title="Mark as executed"
                    className="p-2 rounded-md text-emerald-600 hover:bg-emerald-50 bg-transparent border-0 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {(c.status === 'DRAFT' || c.status === 'SENT') && (
                  <button
                    onClick={() => {
                      const reason = prompt('Reason for voiding this contract:')
                      if (reason) onStatusChange(c.id, 'VOIDED', { voidReason: reason })
                    }}
                    title="Void contract"
                    className="p-2 rounded-md text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-red-500 bg-transparent border-0 cursor-pointer transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between">
              <ProgressTracker currentStage={stage} />
              <div className="flex items-center gap-4 text-[0.72rem] text-[#9CA3AF] flex-shrink-0 ml-4">
                <span>Created: {relativeTime(c.createdAt)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SIGNATURE TIMELINE
   ═══════════════════════════════════════════════ */
function SignatureTimeline({ contract }: { contract: ContractDetailData }) {
  const events = [
    { label: 'Contract Created', date: contract.createdAt, color: 'bg-gray-400', done: true },
    {
      label: contract.status === 'SENT' || contract.status === 'EXECUTED' ? 'Contract Sent' : 'Awaiting Send',
      date: contract.status !== 'DRAFT' ? contract.updatedAt : null,
      color: contract.status !== 'DRAFT' ? 'bg-blue-500' : 'bg-gray-200',
      done: contract.status !== 'DRAFT',
    },
    {
      label: 'Buyer Signed',
      date: contract.buyerSignedAt,
      color: contract.buyerSignedAt ? 'bg-emerald-500' : 'bg-gray-200',
      done: !!contract.buyerSignedAt,
    },
    {
      label: 'Seller Signed',
      date: contract.sellerSignedAt,
      color: contract.sellerSignedAt ? 'bg-emerald-500' : 'bg-gray-200',
      done: !!contract.sellerSignedAt,
    },
  ]

  if (contract.voidedAt) {
    events.push({
      label: `Voided${contract.voidReason ? `: ${contract.voidReason}` : ''}`,
      date: contract.voidedAt,
      color: 'bg-red-500',
      done: true,
    })
  }

  return (
    <div className="space-y-0">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-3 relative">
          {i < events.length - 1 && (
            <div className={`absolute left-[7px] top-[18px] w-0.5 h-[calc(100%-2px)] ${e.done ? 'bg-gray-300' : 'bg-gray-100'}`} />
          )}
          <div className={`w-[15px] h-[15px] rounded-full flex-shrink-0 mt-0.5 ${e.color} flex items-center justify-center`}>
            {e.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
          </div>
          <div className="pb-4 min-w-0">
            <div className={`text-[0.78rem] ${e.done ? 'text-[#374151] font-medium' : 'text-[#9CA3AF]'}`}>{e.label}</div>
            {e.date && (
              <div className="text-[0.72rem] text-[#9CA3AF]">{new Date(e.date).toLocaleDateString()} at {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   VERSION HISTORY
   ═══════════════════════════════════════════════ */
function changeTypeLabel(t: string): string {
  switch (t) {
    case 'created': return 'Created'
    case 'fields_updated': return 'Fields Updated'
    case 'status_changed': return 'Status Changed'
    case 'template_changed': return 'Template Changed'
    case 'restored': return 'Restored'
    default: return t
  }
}

function changeTypeColor(t: string): string {
  switch (t) {
    case 'created': return 'text-emerald-700 bg-emerald-50'
    case 'fields_updated': return 'text-blue-700 bg-blue-50'
    case 'status_changed': return 'text-amber-700 bg-amber-50'
    case 'restored': return 'text-violet-700 bg-violet-50'
    default: return 'text-[#6B7280] bg-gray-100'
  }
}

function VersionHistory({ contractId }: { contractId: string }) {
  const toast = useToast()
  const [versions, setVersions] = useState<ContractVersionRow[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [diffA, setDiffA] = useState<number | null>(null)
  const [diffB, setDiffB] = useState<number | null>(null)
  const [diffs, setDiffs] = useState<VersionDiffItem[] | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/contracts/${contractId}/versions`)
      .then(r => r.json())
      .then(data => {
        setVersions(data.versions || [])
        setCurrentVersion(data.currentVersion || 1)
      })
      .catch(() => toast('Failed to load version history'))
      .finally(() => setLoading(false))
  }, [contractId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompare = async () => {
    if (!diffA || !diffB || diffA === diffB) {
      toast('Select two different versions to compare')
      return
    }
    setDiffLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/versions?diffA=${diffA}&diffB=${diffB}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDiffs(data.diffs || [])
    } catch {
      toast('Failed to load diff')
    } finally {
      setDiffLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 mb-5 animate-fadeInUp">
        <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> Version History
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
        </div>
      </div>
    )
  }

  if (versions.length === 0) return null

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 mb-5 animate-fadeInUp">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> Version History
          <span className="text-[0.66rem] font-bold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
            v{currentVersion}
          </span>
        </div>
        {versions.length >= 2 && (
          <button
            onClick={() => { setComparing(!comparing); setDiffs(null) }}
            className="flex items-center gap-1 text-[0.72rem] font-medium text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors"
          >
            <GitCompare className="w-3 h-3" />
            {comparing ? 'Hide Compare' : 'Compare Versions'}
          </button>
        )}
      </div>

      {/* Compare UI */}
      {comparing && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <label className="text-[0.72rem] text-[#9CA3AF] block mb-1">From</label>
              <select
                value={diffA ?? ''}
                onChange={e => { setDiffA(parseInt(e.target.value) || null); setDiffs(null) }}
                className="w-full bg-white border border-[#E5E7EB] rounded px-2.5 py-1.5 text-[0.78rem] text-[#374151] outline-none focus:border-[#2563EB]"
              >
                <option value="">Select version...</option>
                {versions.map(v => (
                  <option key={v.version} value={v.version}>v{v.version} — {changeTypeLabel(v.changeType)}</option>
                ))}
              </select>
            </div>
            <ArrowRight className="w-4 h-4 text-[#9CA3AF] mt-4 flex-shrink-0" />
            <div className="flex-1">
              <label className="text-[0.72rem] text-[#9CA3AF] block mb-1">To</label>
              <select
                value={diffB ?? ''}
                onChange={e => { setDiffB(parseInt(e.target.value) || null); setDiffs(null) }}
                className="w-full bg-white border border-[#E5E7EB] rounded px-2.5 py-1.5 text-[0.78rem] text-[#374151] outline-none focus:border-[#2563EB]"
              >
                <option value="">Select version...</option>
                {versions.map(v => (
                  <option key={v.version} value={v.version}>v{v.version} — {changeTypeLabel(v.changeType)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={!diffA || !diffB || diffA === diffB || diffLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white border-0 rounded text-[0.72rem] font-medium cursor-pointer transition-colors mt-4"
            >
              {diffLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCompare className="w-3 h-3" />}
              Compare
            </button>
          </div>

          {/* Diff results */}
          {diffs !== null && (
            <div className="mt-2">
              {diffs.length === 0 ? (
                <div className="text-[0.78rem] text-[#9CA3AF] py-2 text-center">No differences found between these versions.</div>
              ) : (
                <div className="border border-[#E5E7EB] rounded overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F3F4F6] border-b border-[#E5E7EB]">
                        <th className="px-3 py-1.5 text-[0.68rem] uppercase tracking-wider text-[#6B7280] font-medium text-left">Field</th>
                        <th className="px-3 py-1.5 text-[0.68rem] uppercase tracking-wider text-red-500 font-medium text-left">v{diffA} (Old)</th>
                        <th className="px-3 py-1.5 text-[0.68rem] uppercase tracking-wider text-emerald-600 font-medium text-left">v{diffB} (New)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffs.map((d, i) => (
                        <tr key={d.field} className={i < diffs.length - 1 ? 'border-b border-[#F3F4F6]' : ''}>
                          <td className="px-3 py-1.5 text-[0.76rem] font-medium text-[#374151]">{d.field.replace(/_/g, ' ')}</td>
                          <td className="px-3 py-1.5 text-[0.76rem] text-red-600 bg-red-50/50 max-w-[200px] truncate">
                            {d.oldValue !== null && d.oldValue !== undefined ? String(d.oldValue) : <span className="text-[#9CA3AF] italic">empty</span>}
                          </td>
                          <td className="px-3 py-1.5 text-[0.76rem] text-emerald-700 bg-emerald-50/50 max-w-[200px] truncate">
                            {d.newValue !== null && d.newValue !== undefined ? String(d.newValue) : <span className="text-[#9CA3AF] italic">empty</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Version list */}
      <div className="space-y-2">
        {versions.map(v => (
          <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`text-[0.66rem] font-bold px-1.5 py-0.5 rounded ${
                v.version === currentVersion ? 'bg-[#2563EB] text-white' : 'bg-[#E5E7EB] text-[#6B7280]'
              }`}>
                v{v.version}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[0.66rem] font-medium px-1.5 py-0.5 rounded-full ${changeTypeColor(v.changeType)}`}>
                    {changeTypeLabel(v.changeType)}
                  </span>
                  {v.changedFields.length > 0 && (
                    <span className="text-[0.68rem] text-[#9CA3AF]">
                      ({v.changedFields.length} field{v.changedFields.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
                {v.changeSummary && (
                  <div className="text-[0.72rem] text-[#6B7280] mt-0.5 truncate max-w-[400px]">{v.changeSummary}</div>
                )}
              </div>
            </div>
            <div className="text-[0.72rem] text-[#9CA3AF] flex-shrink-0 ml-3">
              {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CONTRACT DETAIL VIEW
   ═══════════════════════════════════════════════ */
function ContractDetail({
  contractId,
  onBack,
  onStatusChange,
  onDownloadPdf,
  onSendContract,
}: {
  contractId: string
  onBack: () => void
  onStatusChange: (id: string, status: string, extra?: Record<string, string>) => void
  onDownloadPdf: (id: string) => void
  onSendContract: (contract: ContractRow) => void
}) {
  const [contract, setContract] = useState<ContractDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/contracts/${contractId}`)
      .then(r => r.json())
      .then(data => setContract({ ...data.contract, contractHistory: data.contractHistory, missingFieldCount: data.missingFieldCount }))
      .catch(() => toast('Failed to load contract'))
      .finally(() => setLoading(false))
  }, [contractId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !contract) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-[#6B7280] hover:text-[#374151] mb-4 bg-transparent border-0 cursor-pointer transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Contracts
        </button>
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-6 py-12 text-center animate-pulse">
          <Loader2 className="w-6 h-6 text-[#9CA3AF] mx-auto animate-spin" />
        </div>
      </div>
    )
  }

  const fd = contract.filledData ?? {}
  const stage = stageIndex(contract.status)
  const typeLabel = contractTypeLabel(contract.templateName)
  const fee = feeFromContract(contract)
  const urgency = urgencyBadge(contract)

  const terms: { label: string; value: string; bold?: boolean; color?: string }[] = [
    { label: 'Contract Price', value: fd.contract_price || fd.originalPurchasePrice || (contract.deal.askingPrice ? `$${contract.deal.askingPrice.toLocaleString()}` : '—') },
    { label: 'Assignment Fee', value: fd.assignment_fee || fd.assignmentFee || (fee ? `$${fee.toLocaleString()}` : '—'), bold: true, color: 'text-[#2563EB]' },
    { label: 'Earnest Money Deposit', value: fd.earnest_money || fd.earnestMoneyAmount || '—' },
    { label: 'Closing Date', value: fd.closing_date || fd.closingDate || '—' },
    { label: 'Property Address', value: `${contract.deal.address}, ${contract.deal.city} ${contract.deal.state} ${contract.deal.zip}` },
  ]
  if (fd.special_conditions) terms.push({ label: 'Special Conditions', value: fd.special_conditions })

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-[#6B7280] hover:text-[#374151] mb-4 bg-transparent border-0 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contracts
      </button>

      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-6 py-5 mb-5 animate-fadeInUp">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)]">
              {contract.deal.address}, {contract.deal.city} {contract.deal.state}
            </h2>
            <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${contractTypeBadge(typeLabel)}`}>{typeLabel}</span>
            {contract.status === 'VOIDED' && (
              <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-red-700 bg-red-50">Voided</span>
            )}
            {contract.status === 'EXECUTED' && (
              <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Executed
              </span>
            )}
            {urgency && (
              <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full border ${urgency.color}`}>
                {urgency.label}
              </span>
            )}
          </div>
          <span className="text-sm text-[#9CA3AF]">Created: {new Date(contract.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Missing fields warning */}
        {contract.missingFieldCount !== undefined && contract.missingFieldCount > 0 && contract.status === 'DRAFT' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md mb-3 text-[0.78rem] text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{contract.missingFieldCount} required field{contract.missingFieldCount > 1 ? 's' : ''} still missing — complete before sending.</span>
          </div>
        )}

        <ProgressTracker currentStage={contract.status === 'VOIDED' ? 0 : stage} />
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4 mb-5 contracts-parties">
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Assignor (You)</div>
          <div className="text-[0.9rem] font-medium text-[#374151] mb-2">
            {fd.assignor_name || fd.assignorName || 'You'}
          </div>
          <div className="space-y-1.5 text-[0.78rem] text-[#374151]">
            {(fd.assignor_phone || fd.assignorPhone) && (
              <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#9CA3AF]" /> {fd.assignor_phone || fd.assignorPhone}</div>
            )}
            {(fd.assignor_email || fd.assignorEmail) && (
              <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#9CA3AF]" /> {fd.assignor_email || fd.assignorEmail}</div>
            )}
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Buyer / Assignee</div>
          <div className="text-[0.9rem] font-medium text-[#374151] mb-2">
            {displayName(contract)}
          </div>
          <div className="space-y-1.5 text-[0.78rem] text-[#374151]">
            {buyerPhone(contract) && (
              <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#9CA3AF]" /> {buyerPhone(contract)}</div>
            )}
            {buyerEmail(contract) && (
              <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#9CA3AF]" /> {buyerEmail(contract)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Deal Terms + Actions */}
      <div className="grid grid-cols-2 gap-4 mb-5 contracts-terms">
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Deal Terms</div>
          <div className="space-y-2">
            {terms.map(t => (
              <div key={t.label} className="flex items-start justify-between">
                <span className="text-[0.78rem] text-[#9CA3AF]">{t.label}</span>
                <span className={`text-[0.82rem] text-right max-w-[55%] ${t.bold ? `font-semibold ${t.color}` : 'text-[#374151]'}`}>
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Actions</div>
          <div className="space-y-2">
            <button
              onClick={() => onDownloadPdf(contract.id)}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md text-[0.82rem] font-medium text-[#2563EB] hover:bg-blue-50 bg-white border border-[#E5E7EB] cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            {contract.status === 'DRAFT' && (
              <button
                onClick={() => onSendContract(contract)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md text-[0.82rem] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] border-0 cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" /> Send Contract
              </button>
            )}
            {contract.status === 'SENT' && (
              <button
                onClick={() => onStatusChange(contract.id, 'EXECUTED')}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md text-[0.82rem] font-medium text-white bg-emerald-600 hover:bg-emerald-700 border-0 cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as Executed
              </button>
            )}
            {(contract.status === 'DRAFT' || contract.status === 'SENT') && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for voiding this contract:')
                  if (reason) onStatusChange(contract.id, 'VOIDED', { voidReason: reason })
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md text-[0.82rem] font-medium text-red-600 hover:bg-red-50 bg-white border border-[#E5E7EB] cursor-pointer transition-colors"
              >
                <Ban className="w-4 h-4" /> Void Contract
              </button>
            )}
          </div>

          {contract.voidReason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-[0.72rem] font-medium text-red-700 mb-1">Void Reason</div>
              <div className="text-[0.78rem] text-red-600">{contract.voidReason}</div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Timeline + Contract History */}
      <div className="grid grid-cols-2 gap-4 mb-5 contracts-terms">
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Signature Timeline</div>
          <SignatureTimeline contract={contract} />
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" /> Contract History for This Deal
          </div>
          {contract.contractHistory && contract.contractHistory.length > 0 ? (
            <div className="space-y-2">
              {contract.contractHistory.map(h => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md">
                  <div>
                    <div className="text-[0.78rem] text-[#374151] font-medium">{h.templateName}</div>
                    <div className="text-[0.72rem] text-[#9CA3AF]">{new Date(h.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${archiveStatusStyle(h.status)}`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[0.78rem] text-[#9CA3AF]">No other contracts for this deal.</p>
          )}
        </div>
      </div>

      {/* Notification Log */}
      {(() => {
        const notifications = (contract.filledData as Record<string, unknown> | null)?._notifications as
          { type: string; recipients: string[]; success: boolean; timestamp: string; errors?: string[] }[] | undefined
        if (!notifications || notifications.length === 0) return null
        return (
          <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 mb-5 animate-fadeInUp">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Email Notifications
            </div>
            <div className="space-y-2">
              {notifications.slice().reverse().map((n, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] rounded-md">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="text-[0.78rem] text-[#374151] font-medium">
                        Contract {n.type.charAt(0) + n.type.slice(1).toLowerCase()}
                      </div>
                      <div className="text-[0.72rem] text-[#9CA3AF]">
                        {n.recipients.length > 0 ? `To: ${n.recipients.join(', ')}` : 'No recipients'}
                        {n.errors && n.errors.length > 0 && (
                          <span className="text-red-500 ml-2">({n.errors.join('; ')})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-[0.72rem] text-[#9CA3AF] flex-shrink-0">
                    {new Date(n.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Version History */}
      <VersionHistory contractId={contract.id} />

      <style>{`
        @media (max-width: 900px) {
          .contracts-parties { grid-template-columns: 1fr !important; }
          .contracts-terms { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CREATE CONTRACT MODAL
   ═══════════════════════════════════════════════ */
function CreateContractModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [deals, setDeals] = useState<DealOption[]>([])
  const [buyers, setBuyers] = useState<BuyerOption[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [selectedDeal, setSelectedDeal] = useState('')
  const [selectedBuyer, setSelectedBuyer] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [creating, setCreating] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({
    firstName: '', lastName: '', entityName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/deals').then(r => r.json()),
      fetch('/api/crm/buyers?limit=200').then(r => r.json()),
      fetch('/api/contracts/templates').then(r => r.json()),
    ]).then(([dealData, buyerData, templateData]) => {
      setDeals(dealData.deals || [])
      setBuyers(buyerData.buyers || [])
      setTemplates(templateData.templates || [])
    }).catch(() => toast('Failed to load form data'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!selectedDeal) {
      toast('Please select a deal')
      return
    }
    if (!manualMode && !selectedBuyer) {
      toast('Please select a buyer or switch to manual entry')
      return
    }
    if (manualMode && !manual.firstName && !manual.entityName) {
      toast('Please enter a buyer name or entity name')
      return
    }
    setCreating(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        dealId: selectedDeal,
        templateId: selectedTemplate || undefined,
        generatePdf: true,
      }
      if (manualMode) {
        payload.manualBuyer = manual
      } else {
        payload.buyerId = selectedBuyer
      }

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create contract')
      toast('Contract created successfully')
      if (data.warning) toast(data.warning)
      onCreated()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create contract')
    } finally {
      setCreating(false)
    }
  }

  const inputCls = "w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-[0.82rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors"
  const labelCls = "block text-[0.78rem] font-medium text-[#374151] mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[1.1rem] font-normal text-[var(--navy-heading,#0B1224)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            Create New Contract
          </h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] bg-transparent border-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Deal select */}
          <div>
            <label className={labelCls}>Deal *</label>
            <div className="relative">
              <select
                value={selectedDeal}
                onChange={e => setSelectedDeal(e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="">Select a deal...</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>{d.address}, {d.city} {d.state}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {/* Buyer mode toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[0.78rem] font-medium text-[#374151]">Buyer *</label>
              <button
                onClick={() => { setManualMode(!manualMode); setSelectedBuyer('') }}
                className="flex items-center gap-1 text-[0.72rem] font-medium text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                {manualMode ? 'Select from CRM' : 'Enter manually'}
              </button>
            </div>

            {!manualMode ? (
              <div className="relative">
                <select
                  value={selectedBuyer}
                  onChange={e => setSelectedBuyer(e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer`}
                >
                  <option value="">Select a buyer...</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.entityName || `${b.firstName} ${b.lastName}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
              </div>
            ) : (
              <div className="space-y-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4">
                <div>
                  <label className={labelCls}>Entity / Company Name</label>
                  <input
                    type="text"
                    value={manual.entityName}
                    onChange={e => setManual({ ...manual, entityName: e.target.value })}
                    placeholder="e.g. Thompson Capital LLC"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First Name</label>
                    <input
                      type="text"
                      value={manual.firstName}
                      onChange={e => setManual({ ...manual, firstName: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input
                      type="text"
                      value={manual.lastName}
                      onChange={e => setManual({ ...manual, lastName: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email"
                      value={manual.email}
                      onChange={e => setManual({ ...manual, email: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input
                      type="tel"
                      value={manual.phone}
                      onChange={e => setManual({ ...manual, phone: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Address</label>
                  <input
                    type="text"
                    value={manual.address}
                    onChange={e => setManual({ ...manual, address: e.target.value })}
                    placeholder="Street address"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>City</label>
                    <input
                      type="text"
                      value={manual.city}
                      onChange={e => setManual({ ...manual, city: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input
                      type="text"
                      value={manual.state}
                      onChange={e => setManual({ ...manual, state: e.target.value })}
                      maxLength={2}
                      placeholder="TX"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>ZIP</label>
                    <input
                      type="text"
                      value={manual.zip}
                      onChange={e => setManual({ ...manual, zip: e.target.value })}
                      maxLength={10}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Template select */}
          <div>
            <label className={labelCls}>Template (optional)</label>
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="">Auto-select by state</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#F3F4F6]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[0.82rem] font-medium text-[#6B7280] hover:text-[#374151] bg-transparent border-0 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white border-0 rounded-md text-[0.82rem] font-medium cursor-pointer transition-colors"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            {creating ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TEMPLATE PREVIEW PANEL
   ═══════════════════════════════════════════════ */
function TemplatePreview({
  template,
  onClose,
  onUseTemplate,
}: {
  template: TemplateRow
  onClose: () => void
  onUseTemplate: (templateId: string) => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-[1.1rem] font-normal text-[var(--navy-heading,#0B1224)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              {template.name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-[0.76rem] text-[#9CA3AF]">
              <span className={`font-medium px-1.5 py-0.5 rounded ${contractTypeBadge(template.type)} text-[0.64rem]`}>{template.type}</span>
              <span>{template.state === 'MULTI' ? 'Multi-State' : template.state}</span>
              <span>v{template.version}</span>
              <span>{template.fieldCount} fields</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] bg-transparent border-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Fields list */}
          {template.fields && template.fields.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Required Fields ({template.fields.filter(f => f.required).length})</h3>
              <div className="grid grid-cols-2 gap-2">
                {template.fields.filter(f => f.required).map(f => (
                  <div key={f.key} className="flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-[0.78rem] text-[#374151]">{f.label}</span>
                    {f.source && (
                      <span className="ml-auto text-[0.66rem] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">auto-fill</span>
                    )}
                  </div>
                ))}
              </div>
              {template.fields.filter(f => !f.required).length > 0 && (
                <>
                  <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3 mt-4">Optional Fields ({template.fields.filter(f => !f.required).length})</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {template.fields.filter(f => !f.required).map(f => (
                      <div key={f.key} className="flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="text-[0.78rem] text-[#9CA3AF]">{f.label}</span>
                        {f.source && (
                          <span className="ml-auto text-[0.66rem] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">auto-fill</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sections */}
          {template.sections && template.sections.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Contract Sections ({template.sections.length})</h3>
              <div className="space-y-3">
                {template.sections.map((s, i) => (
                  <div key={i} className="border border-[#E5E7EB] rounded-lg p-4">
                    <div className="text-[0.86rem] font-medium text-[#374151] mb-2">{s.heading}</div>
                    <div
                      className="text-[0.76rem] text-[#6B7280] leading-relaxed line-clamp-4"
                      dangerouslySetInnerHTML={{
                        __html: s.body.replace(
                          /\{\{(\w+)\}\}/g,
                          '<span class="text-[#2563EB] font-medium bg-blue-50 px-1 rounded">{{$1}}</span>'
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[0.82rem] font-medium text-[#6B7280] hover:text-[#374151] bg-transparent border-0 cursor-pointer transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => onUseTemplate(template.id)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md text-[0.82rem] font-medium cursor-pointer transition-colors"
          >
            <FileSignature className="w-4 h-4" /> Use This Template
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TEMPLATE COMPARISON
   ═══════════════════════════════════════════════ */
function TemplateComparison({
  templates,
  onClose,
}: {
  templates: TemplateRow[]
  onClose: () => void
}) {
  const [leftId, setLeftId] = useState(templates[0]?.id || '')
  const [rightId, setRightId] = useState(templates[1]?.id || '')

  const left = templates.find(t => t.id === leftId)
  const right = templates.find(t => t.id === rightId)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[1.1rem] font-normal text-[var(--navy-heading,#0B1224)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            Compare Templates
          </h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] bg-transparent border-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <select
                value={leftId}
                onChange={e => setLeftId(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-[0.82rem] text-[#374151] outline-none focus:border-[#2563EB] appearance-none cursor-pointer"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={rightId}
                onChange={e => setRightId(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-[0.82rem] text-[#374151] outline-none focus:border-[#2563EB] appearance-none cursor-pointer"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {left && right && (
            <div>
              {/* Overview comparison */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-[#6B7280] font-medium">Attribute</th>
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-[#6B7280] font-medium">{left.name}</th>
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-[#6B7280] font-medium">{right.name}</th>
                  </tr>
                </thead>
                <tbody className="text-[0.78rem]">
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-2 text-[#9CA3AF]">State</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{left.state}</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{right.state}</td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-2 text-[#9CA3AF]">Type</td>
                    <td className="px-4 py-2 text-[#374151]">{left.type}</td>
                    <td className="px-4 py-2 text-[#374151]">{right.type}</td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-2 text-[#9CA3AF]">Version</td>
                    <td className="px-4 py-2 text-[#374151]">v{left.version}</td>
                    <td className="px-4 py-2 text-[#374151]">v{right.version}</td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-2 text-[#9CA3AF]">Total Fields</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{left.fieldCount}</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{right.fieldCount}</td>
                  </tr>
                  <tr className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-2 text-[#9CA3AF]">Required Fields</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{left.fields?.filter(f => f.required).length ?? '—'}</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{right.fields?.filter(f => f.required).length ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-[#9CA3AF]">Sections</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{left.sections?.length ?? '—'}</td>
                    <td className="px-4 py-2 text-[#374151] font-medium">{right.sections?.length ?? '—'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section headings comparison */}
              {left.sections && right.sections && (
                <div>
                  <h3 className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Section Comparison</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {left.sections.map((s, i) => (
                        <div key={i} className="px-3 py-2 bg-[#F9FAFB] rounded-md text-[0.78rem] text-[#374151]">{s.heading}</div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {right.sections.map((s, i) => (
                        <div key={i} className="px-3 py-2 bg-[#F9FAFB] rounded-md text-[0.78rem] text-[#374151]">{s.heading}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TEMPLATES SECTION
   ═══════════════════════════════════════════════ */
function TemplatesSection({ onUseTemplate }: { onUseTemplate: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    fetch('/api/contracts/templates?detail=true')
      .then(r => r.json())
      .then(data => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const coveredStates = Array.from(new Set(templates.map(t => t.state).filter(s => s !== 'MULTI')))

  if (loading) return <ContractSkeleton />

  return (
    <div>
      {/* State coverage + compare button */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {coveredStates.map(s => (
              <span key={s} className="text-[0.66rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">{s}</span>
            ))}
          </div>
          <span className="text-[0.82rem] text-[#374151] font-medium">{coveredStates.length} States Covered</span>
        </div>
        {templates.length >= 2 && (
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.78rem] font-medium text-[#2563EB] hover:bg-blue-50 bg-transparent border border-[#E5E7EB] rounded-md cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Compare Templates
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 contracts-template-grid">
        {templates.map(t => (
          <div key={t.id} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 hover:bg-[#F9FAFB] transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#9CA3AF]" />
                </div>
                <div>
                  <div className="text-[0.86rem] font-medium text-[#374151] mb-0.5">{t.name}</div>
                  <div className="flex items-center gap-2 text-[0.72rem] text-[#9CA3AF]">
                    <span className={`font-medium px-1.5 py-0.5 rounded ${contractTypeBadge(t.type)} text-[0.64rem]`}>{t.type}</span>
                    <span>{t.state === 'MULTI' ? 'Multi-State' : t.state}</span>
                    <span>v{t.version}</span>
                    <span>{t.fieldCount} fields</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(t)}
                className="text-[0.72rem] font-medium text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors flex items-center gap-1 mt-1"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUseTemplate={(id) => {
            setPreviewTemplate(null)
            onUseTemplate(id)
          }}
        />
      )}

      {showComparison && (
        <TemplateComparison
          templates={templates}
          onClose={() => setShowComparison(false)}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .contracts-template-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ARCHIVE SECTION
   ═══════════════════════════════════════════════ */
function ArchiveSection({
  contracts,
  loading,
  onViewDetail,
}: {
  contracts: ContractRow[]
  loading: boolean
  onViewDetail: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const toast = useToast()

  const archived = contracts.filter(c => c.status === 'EXECUTED' || c.status === 'VOIDED')

  const filtered = search
    ? archived.filter(c =>
        c.deal.address.toLowerCase().includes(search.toLowerCase()) ||
        c.templateName.toLowerCase().includes(search.toLowerCase()) ||
        displayName(c).toLowerCase().includes(search.toLowerCase())
      )
    : archived

  const executedContracts = archived.filter(c => c.status === 'EXECUTED')
  const executedCount = executedContracts.length
  const voidedCount = archived.filter(c => c.status === 'VOIDED').length
  const totalFees = executedContracts.reduce((sum, c) => sum + (feeFromContract(c) || 0), 0)

  // Average time to execution (days from creation to last update for executed)
  const avgTimeToExecution = executedContracts.length > 0
    ? Math.round(
        executedContracts.reduce((sum, c) => {
          const created = new Date(c.createdAt).getTime()
          const executed = new Date(c.updatedAt).getTime()
          return sum + (executed - created) / 86400000
        }, 0) / executedContracts.length
      )
    : 0

  const handleCsvExport = () => {
    if (archived.length === 0) {
      toast('No archived contracts to export')
      return
    }
    const header = 'Property Address,City,State,Zip,Type,Buyer,Fee,Status,Created,Updated\n'
    const rows = archived.map(c => {
      const fee = feeFromContract(c)
      return [
        `"${c.deal.address}"`,
        `"${c.deal.city}"`,
        c.deal.state,
        c.deal.zip,
        contractTypeLabel(c.templateName),
        `"${displayName(c)}"`,
        fee ?? '',
        c.status,
        new Date(c.createdAt).toLocaleDateString(),
        new Date(c.updatedAt).toLocaleDateString(),
      ].join(',')
    }).join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contracts-archive-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('Archive exported as CSV')
  }

  if (loading) return <ContractSkeleton />

  return (
    <div>
      {/* Analytics cards */}
      <div className="grid grid-cols-4 gap-3 mb-5 contracts-archive-stats">
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[0.72rem] text-[#9CA3AF] uppercase tracking-wider font-medium">Executed</span>
          </div>
          <div className="text-[1.2rem] font-semibold text-[#374151]">{executedCount}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            <span className="text-[0.72rem] text-[#9CA3AF] uppercase tracking-wider font-medium">Total Fees</span>
          </div>
          <div className="text-[1.2rem] font-semibold text-[#2563EB]">${totalFees.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-amber-500" />
            <span className="text-[0.72rem] text-[#9CA3AF] uppercase tracking-wider font-medium">Avg Days to Close</span>
          </div>
          <div className="text-[1.2rem] font-semibold text-[#374151]">{avgTimeToExecution || '—'}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Ban className="w-4 h-4 text-red-400" />
            <span className="text-[0.72rem] text-[#9CA3AF] uppercase tracking-wider font-medium">Voided</span>
          </div>
          <div className="text-[1.2rem] font-semibold text-[#374151]">{voidedCount}</div>
        </div>
      </div>

      {/* Search + Export */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search archived contracts..."
            className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-10 pr-4 py-2 text-[0.82rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>
        <button
          onClick={handleCsvExport}
          className="flex items-center gap-1.5 px-3 py-2 text-[0.78rem] font-medium text-[#374151] hover:bg-[#F9FAFB] bg-white border border-[#E5E7EB] rounded-lg cursor-pointer transition-colors"
        >
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              {['Property Address', 'Type', 'Buyer', 'Fee', 'Status', 'Date', ''].map(h => (
                <th key={h} className={`px-4 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[0.82rem] text-[#9CA3AF]">
                  No archived contracts found.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const fee = feeFromContract(c)
                return (
                  <tr key={c.id} className={`${i < filtered.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#F9FAFB] transition-colors`}>
                    <td className="px-4 py-2.5 text-[0.82rem] text-[#374151] font-medium">
                      {c.deal.address}, {c.deal.city} {c.deal.state}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${contractTypeBadge(contractTypeLabel(c.templateName))}`}>
                        {contractTypeLabel(c.templateName)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[0.78rem] text-[#374151]">{displayName(c)}</td>
                    <td className="px-4 py-2.5 text-[0.82rem] text-[#374151] font-medium">
                      {fee ? `$${fee.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${archiveStatusStyle(c.status)}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[#9CA3AF]">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onViewDetail(c.id)}
                        className="text-[0.72rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .contracts-archive-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN CONTRACTS PAGE
   ═══════════════════════════════════════════════ */
export default function ContractsPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [detailContractId, setDetailContractId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null)
  const [sendContractTarget, setSendContractTarget] = useState<ContractRow | null>(null)

  const showDetail = detailContractId !== null

  const fetchContracts = useCallback(() => {
    setLoading(true)
    fetch('/api/contracts')
      .then(r => r.json())
      .then(data => setContracts(data.contracts || []))
      .catch(() => toast('Failed to load contracts'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchContracts() }, [fetchContracts])

  const handleStatusChange = async (id: string, status: string, extra?: Record<string, string>) => {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast(`Contract ${status === 'SENT' ? 'sent' : status === 'EXECUTED' ? 'executed' : 'voided'} successfully`)
      fetchContracts()
      if (showDetail) setDetailContractId(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update contract')
    }
  }

  const handleSendContract = (contract: ContractRow) => {
    setSendContractTarget(contract)
  }

  const handleConfirmSend = () => {
    if (sendContractTarget) {
      handleStatusChange(sendContractTarget.id, 'SENT')
      setSendContractTarget(null)
    }
  }

  const handleDownloadPdf = async (id: string) => {
    try {
      const res = await fetch(`/api/contracts/${id}/pdf`)
      if (!res.ok) throw new Error('Failed to download PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contract-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to download PDF')
    }
  }

  const handleUseTemplate = (templateId: string) => {
    setShowCreateModal(true)
  }

  // Stats
  const activeContracts = contracts.filter(c => c.status === 'DRAFT' || c.status === 'SENT')
  const awaitingSig = contracts.filter(c => c.status === 'SENT').length
  const executedThisMonth = contracts.filter(c => {
    if (c.status !== 'EXECUTED') return false
    const d = new Date(c.updatedAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const totalFees = contracts
    .filter(c => c.status === 'DRAFT' || c.status === 'SENT')
    .reduce((sum, c) => sum + (feeFromContract(c) || 0), 0)

  return (
    <div className="p-8 max-w-[1200px] bg-[var(--cream,#FAF9F6)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] mb-1"
          >
            Contracts
          </h1>
          <p className="text-[0.86rem] text-[var(--body-text,#4B5563)]">
            Generate, sign, and track assignment contracts.
          </p>
        </div>
        {!showDetail && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-5 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Contract
          </button>
        )}
      </div>

      {!showDetail && (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-6 bg-white border border-[#E5E7EB] rounded-lg px-5 py-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] text-[#374151] font-medium">{activeContracts.length}</span>
              <span className="text-[0.78rem] text-[#9CA3AF]">Active Contracts</span>
            </div>
            <div className="w-px h-4 bg-[#E5E7EB]" />
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] text-amber-600 font-medium">{awaitingSig}</span>
              <span className="text-[0.78rem] text-[#9CA3AF]">Awaiting Signature</span>
            </div>
            <div className="w-px h-4 bg-[#E5E7EB]" />
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] text-emerald-600 font-medium">{executedThisMonth}</span>
              <span className="text-[0.78rem] text-[#9CA3AF]">Executed This Month</span>
            </div>
            {totalFees > 0 && (
              <>
                <div className="w-px h-4 bg-[#E5E7EB]" />
                <div className="flex items-center gap-2">
                  <span className="text-[0.82rem] text-[#2563EB] font-medium">${totalFees.toLocaleString()}</span>
                  <span className="text-[0.78rem] text-[#9CA3AF]">in Assignment Fees</span>
                </div>
              </>
            )}
          </div>

          {/* Pipeline View */}
          {activeTab === 'active' && (
            <PipelineView
              contracts={contracts}
              activeFilter={pipelineFilter}
              onFilterChange={setPipelineFilter}
            />
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-[#E5E7EB] pb-0">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    if (tab.key !== 'active') setPipelineFilter(null)
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer bg-transparent border-0 border-b-2 -mb-[1px] transition-colors ${
                    isActive
                      ? 'border-[#2563EB] text-[#2563EB]'
                      : 'border-transparent text-[#9CA3AF] hover:text-[#374151]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'active' && (
            <ActiveContractsSection
              contracts={contracts}
              loading={loading}
              pipelineFilter={pipelineFilter}
              onViewDetail={id => setDetailContractId(id)}
              onStatusChange={handleStatusChange}
              onSendContract={handleSendContract}
            />
          )}
          {activeTab === 'templates' && <TemplatesSection onUseTemplate={handleUseTemplate} />}
          {activeTab === 'archive' && (
            <ArchiveSection
              contracts={contracts}
              loading={loading}
              onViewDetail={id => setDetailContractId(id)}
            />
          )}
        </>
      )}

      {showDetail && (
        <ContractDetail
          contractId={detailContractId!}
          onBack={() => setDetailContractId(null)}
          onStatusChange={handleStatusChange}
          onDownloadPdf={handleDownloadPdf}
          onSendContract={handleSendContract}
        />
      )}

      {showCreateModal && (
        <CreateContractModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchContracts}
        />
      )}

      {sendContractTarget && (
        <SendContractDialog
          contract={sendContractTarget}
          onClose={() => setSendContractTarget(null)}
          onConfirm={handleConfirmSend}
        />
      )}
    </div>
  )
}
