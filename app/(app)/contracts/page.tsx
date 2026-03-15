'use client'

import { useState } from 'react'
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
  Printer,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronDown,
  Eye,
  Lock,
  Sparkles,
} from 'lucide-react'

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
const stages = ['Draft', 'Sent to Buyer', 'Buyer Signed', 'Sent to Seller', 'Fully Executed']

function contractTypeBadge(_t: string) {
  return 'text-[#6B7280] bg-[#F3F4F6]'
}

function deadlineColor(days: number) {
  if (days <= 2) return 'text-red-600 bg-red-50'
  if (days <= 6) return 'text-amber-600 bg-amber-50'
  return 'text-emerald-600 bg-emerald-50'
}

/* ═══════════════════════════════════════════════
   MOCK:ACTIVE CONTRACTS
   ═══════════════════════════════════════════════ */
const activeContracts = [
  { id: 1, address: '4217 Magnolia Ave, Dallas TX', type: 'Assignment', seller: 'John Delacroix', buyer: 'Marcus Thompson', fee: 22500, stage: 3, created: 'Mar 8, 2026', deadline: 'Mar 22, 2026', daysLeft: 9 },
  { id: 2, address: '1083 Peachtree Ct, Atlanta GA', type: 'Assignment', seller: 'Linda Okafor', buyer: 'Derrick Jones', fee: 18000, stage: 1, created: 'Mar 10, 2026', deadline: 'Mar 28, 2026', daysLeft: 15 },
  { id: 3, address: '902 Cactus Rd, Phoenix AZ', type: 'Double Close', seller: 'Maria Gonzalez', buyer: 'David Chen', fee: 25000, stage: 1, created: 'Mar 11, 2026', deadline: 'Mar 16, 2026', daysLeft: 3 },
  { id: 4, address: '5501 Bay Shore Dr, Tampa FL', type: 'Assignment', seller: 'Robert Niles', buyer: 'Kevin Nguyen', fee: 35000, stage: 2, created: 'Mar 5, 2026', deadline: 'Mar 19, 2026', daysLeft: 6 },
  { id: 5, address: '2740 Elm St, Dallas TX', type: 'Assignment', seller: 'Patricia Moreno', buyer: 'Aisha Williams', fee: 15000, stage: 0, created: 'Mar 13, 2026', deadline: 'Mar 27, 2026', daysLeft: 14 },
  { id: 6, address: '871 Dogwood Ln, Atlanta GA', type: 'JV Agreement', seller: 'Estate of R. Williams', buyer: 'Sarah Kim', fee: 8500, stage: 3, created: 'Feb 28, 2026', deadline: 'Mar 15, 2026', daysLeft: 2 },
  { id: 7, address: '3300 Hillcrest Blvd, Tampa FL', type: 'Assignment', seller: 'Anthony Brooks', buyer: 'Ryan Mitchell', fee: 24500, stage: 4, created: 'Feb 22, 2026', deadline: 'Mar 10, 2026', daysLeft: 0 },
]

/* ═══════════════════════════════════════════════
   MOCK:TEMPLATES
   ═══════════════════════════════════════════════ */
const templates = [
  { id: 1, name: 'Texas Assignment Agreement', state: 'TX', type: 'Assignment', updated: 'Mar 1, 2026' },
  { id: 2, name: 'Florida Assignment Agreement', state: 'FL', type: 'Assignment', updated: 'Feb 28, 2026' },
  { id: 3, name: 'Georgia Assignment Agreement', state: 'GA', type: 'Assignment', updated: 'Mar 5, 2026' },
  { id: 4, name: 'Arizona Assignment Agreement', state: 'AZ', type: 'Assignment', updated: 'Feb 20, 2026' },
  { id: 5, name: 'Ohio Assignment Agreement', state: 'OH', type: 'Assignment', updated: 'Feb 15, 2026' },
  { id: 6, name: 'Texas Double Close Agreement', state: 'TX', type: 'Double Close', updated: 'Mar 1, 2026' },
  { id: 7, name: 'JV Partnership Agreement', state: 'Multi', type: 'JV Agreement', updated: 'Feb 10, 2026' },
  { id: 8, name: 'Buyer Representation Agreement', state: 'Multi', type: 'Buyer Agreement', updated: 'Jan 25, 2026' },
  { id: 9, name: 'Proof of Funds Request Letter', state: 'Multi', type: 'Other', updated: 'Jan 15, 2026' },
  { id: 10, name: 'Earnest Money Receipt', state: 'Multi', type: 'Other', updated: 'Jan 10, 2026' },
]

const coveredStates = ['TX', 'FL', 'GA', 'AZ', 'OH']

/* ═══════════════════════════════════════════════
   MOCK:ARCHIVE
   ═══════════════════════════════════════════════ */
const archivedContracts = [
  { id: 1, address: '2201 Elm Ave, Dallas TX', type: 'Assignment', parties: 'J. Hernandez → K. Nguyen', fee: 24500, status: 'Executed', date: 'Feb 28, 2026' },
  { id: 2, address: '1510 Roswell Rd, Atlanta GA', type: 'Assignment', parties: 'D. Foster → J. Rivera', fee: 18000, status: 'Executed', date: 'Feb 22, 2026' },
  { id: 3, address: '940 Birch Dr, Phoenix AZ', type: 'Double Close', parties: 'T. Santos → D. Chen', fee: 32000, status: 'Executed', date: 'Feb 15, 2026' },
  { id: 4, address: '6100 Plano Pkwy, Dallas TX', type: 'Assignment', parties: 'M. Brooks → A. Williams', fee: 12000, status: 'Expired', date: 'Feb 10, 2026' },
  { id: 5, address: '780 Spring St, Atlanta GA', type: 'JV Agreement', parties: 'S. Kim → D. Jones', fee: 8500, status: 'Executed', date: 'Feb 5, 2026' },
  { id: 6, address: '3801 N 7th Ave, Phoenix AZ', type: 'Assignment', parties: 'C. Medina → O. Bryant', fee: 19500, status: 'Voided', date: 'Jan 28, 2026' },
  { id: 7, address: '2500 Main St, Dallas TX', type: 'Assignment', parties: 'R. Martinez → M. Thompson', fee: 21000, status: 'Executed', date: 'Jan 22, 2026' },
  { id: 8, address: '1120 Piedmont Ave, Atlanta GA', type: 'Assignment', parties: 'A. Scott → T. King', fee: 16500, status: 'Executed', date: 'Jan 15, 2026' },
  { id: 9, address: '4400 E Thomas Rd, Phoenix AZ', type: 'Assignment', parties: 'L. Park → C. Medina', fee: 14000, status: 'Expired', date: 'Jan 8, 2026' },
  { id: 10, address: '8900 Forest Ln, Dallas TX', type: 'Double Close', parties: 'T. Brooks → K. Nguyen', fee: 28000, status: 'Executed', date: 'Dec 20, 2025' },
  { id: 11, address: '500 Ponce De Leon, Atlanta GA', type: 'Assignment', parties: 'N. Foster → D. Jones', fee: 11000, status: 'Voided', date: 'Dec 12, 2025' },
  { id: 12, address: '1950 Camelback Rd, Phoenix AZ', type: 'Assignment', parties: 'J. Walker → D. Chen', fee: 22500, status: 'Executed', date: 'Nov 30, 2025' },
]

/* ═══════════════════════════════════════════════
   PROGRESS TRACKER
   ═══════════════════════════════════════════════ */
function ProgressTracker({ currentStage }: { currentStage: number }) {
  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => {
        const done = i < currentStage
        const active = i === currentStage
        const future = i > currentStage
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
   ACTIVE CONTRACTS
   ═══════════════════════════════════════════════ */
function ActiveContractsSection({ onViewDetail }: { onViewDetail: (id: number) => void }) {
  return (
    <div className="space-y-3">
      {activeContracts.map(c => (
        <div key={c.id} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 hover:bg-[#F9FAFB] transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h3 className="text-[0.9rem] font-medium text-[#374151]">{c.address}</h3>
                <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${contractTypeBadge(c.type)}`}>{c.type}</span>
                {c.stage === 4 && (
                  <span className="text-[0.66rem] font-medium px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Executed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[0.76rem] text-[#9CA3AF]">
                <span>Seller: <strong className="text-[#374151]">{c.seller}</strong></span>
                <span className="text-gray-300">→</span>
                <span>Buyer: <strong className="text-[#374151]">{c.buyer}</strong></span>
                <span className="text-gray-300">|</span>
                <span>Fee: <strong className="text-[#2563EB]">${c.fee.toLocaleString()}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onViewDetail(c.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#2563EB] hover:bg-blue-50 bg-transparent border-0 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              {c.stage > 0 && c.stage < 4 && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-amber-600 hover:bg-amber-50 bg-transparent border-0 cursor-pointer transition-colors">
                  <Bell className="w-3.5 h-3.5" /> Remind
                </button>
              )}
              {c.stage === 0 && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#6B7280] hover:bg-[#F9FAFB] bg-transparent border-0 cursor-pointer transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
              <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[0.76rem] font-medium text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-red-500 bg-transparent border-0 cursor-pointer transition-colors">
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress + metadata */}
          <div className="flex items-end justify-between">
            <ProgressTracker currentStage={c.stage} />
            <div className="flex items-center gap-4 text-[0.72rem] text-[#9CA3AF] flex-shrink-0 ml-4">
              <span>Created: {c.created}</span>
              {c.stage < 4 && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-medium ${deadlineColor(c.daysLeft)}`}>
                  <Clock className="w-3 h-3" />
                  {c.daysLeft === 0 ? 'Closed' : c.daysLeft === 1 ? '1 day left' : `${c.daysLeft} days left`}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CONTRACT DETAIL VIEW
   ═══════════════════════════════════════════════ */
function ContractDetail({ contractId, onBack }: { contractId: number; onBack: () => void }) {
  const c = activeContracts.find(x => x.id === contractId) || activeContracts[0]

  const activityLog = [
    { date: 'Mar 11, 2026', text: 'Reminder sent to seller John Delacroix' },
    { date: 'Mar 9, 2026', text: 'Sent to seller John Delacroix for signature' },
    { date: 'Mar 9, 2026', text: 'Buyer Marcus Thompson signed the contract' },
    { date: 'Mar 9, 2026', text: 'Buyer Marcus Thompson opened the contract' },
    { date: 'Mar 8, 2026', text: 'Contract sent to buyer Marcus Thompson' },
    { date: 'Mar 8, 2026', text: 'Contract created' },
  ]

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-[#6B7280] hover:text-[#374151] mb-4 bg-transparent border-0 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contracts
      </button>

      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-6 py-5 mb-5 animate-fadeInUp">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-[#111827]">
              {c.address}
            </h2>
            <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${contractTypeBadge(c.type)}`}>{c.type}</span>
          </div>
          <span className="text-sm text-[#9CA3AF]">Created: {c.created}</span>
        </div>
        <ProgressTracker currentStage={c.stage} />
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4 mb-5 contracts-parties">
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Seller / Assignor</div>
          <div className="text-[0.9rem] font-medium text-[#374151] mb-2">{c.seller}</div>
          <div className="space-y-1.5 text-[0.78rem] text-[#374151]">
            <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#9CA3AF]" /> (214) 555-4821</div>
            <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#9CA3AF]" /> j.delacroix@email.com</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Buyer / Assignee</div>
          <div className="text-[0.9rem] font-medium text-[#374151] mb-2">{c.buyer}</div>
          <div className="space-y-1.5 text-[0.78rem] text-[#374151]">
            <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#9CA3AF]" /> (214) 555-0147</div>
            <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#9CA3AF]" /> marcus.t@gmail.com</div>
          </div>
        </div>
      </div>

      {/* Deal Terms + Signatures */}
      <div className="grid grid-cols-2 gap-4 mb-5 contracts-terms">
        {/* Terms */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Deal Terms</div>
          <div className="space-y-2">
            {[
              { label: 'Contract Price', value: '$260,000' },
              { label: 'Assignment Fee', value: '$22,500', bold: true, color: 'text-[#2563EB]' },
              { label: 'Earnest Money Deposit', value: '$5,000' },
              { label: 'EMD Held By', value: 'Lone Star Title Co.' },
              { label: 'Closing Date', value: 'March 22, 2026' },
              { label: 'Title Company', value: 'Lone Star Title Co.' },
              { label: 'Title Contact', value: '(214) 555-8800' },
              { label: 'Special Conditions', value: 'Subject to clear title; buyer inspection within 5 days' },
            ].map(t => (
              <div key={t.label} className="flex items-start justify-between">
                <span className="text-[0.78rem] text-[#9CA3AF]">{t.label}</span>
                <span className={`text-[0.82rem] text-right max-w-[55%] ${t.bold ? `font-semibold ${t.color}` : 'text-[#374151]'}`}>
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Signature Status</div>
          <div className="space-y-4">
            {/* Buyer: signed */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6]">
              <div>
                <div className="text-[0.82rem] font-medium text-[#374151]">{c.buyer}</div>
                <div className="text-[0.72rem] text-[#9CA3AF]">Buyer / Assignee</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[0.72rem] text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Signed
                  </div>
                  <div className="text-[0.66rem] text-[#9CA3AF]">Mar 9, 2026</div>
                </div>
                {/* Signature squiggle */}
                <svg width="60" height="24" viewBox="0 0 60 24" className="flex-shrink-0 opacity-60">
                  <path d="M2 18 C10 2, 18 22, 26 12 S34 2, 42 14 S50 22, 58 6" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            {/* Seller: pending */}
            <div className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-[0.82rem] font-medium text-[#374151]">{c.seller}</div>
                <div className="text-[0.72rem] text-[#9CA3AF]">Seller / Assignor</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[0.72rem] text-amber-600 font-medium">
                  <Clock className="w-3 h-3" /> Pending
                </div>
                <button className="text-[0.72rem] text-[#2563EB] hover:text-[#1D4ED8] bg-blue-50 hover:bg-blue-100 border-0 rounded-md px-2.5 py-1 cursor-pointer transition-colors font-medium">
                  Send Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
          <span className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em]">Document Preview</span>
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#2563EB] hover:bg-blue-50 bg-transparent border-0 cursor-pointer transition-colors">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#2563EB] hover:bg-blue-50 bg-transparent border-0 cursor-pointer transition-colors">
              <Send className="w-3.5 h-3.5" /> Send for Signature
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#6B7280] hover:bg-[#F9FAFB] bg-transparent border-0 cursor-pointer transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>
        {/* Mock document */}
        <div className="bg-[#FAFAFA] p-6 flex justify-center">
          <div className="bg-white border border-[#E5E7EB] rounded-lg w-full max-w-[560px] px-10 py-8">
            <div className="text-center mb-6">
              <h3 className="text-[1.05rem] font-bold text-[#111827] uppercase tracking-wide">Assignment of Contract Agreement</h3>
              <div className="w-16 h-0.5 bg-gray-300 mx-auto mt-2" />
            </div>
            <div className="space-y-3 text-[0.82rem] text-[#374151] leading-relaxed mb-8">
              <div className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span className="text-[#9CA3AF]">Assignor:</span>
                <span className="font-medium">You (DealFlow AI User)</span>
              </div>
              <div className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span className="text-[#9CA3AF]">Assignee:</span>
                <span className="font-medium">Marcus Thompson</span>
              </div>
              <div className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span className="text-[#9CA3AF]">Property:</span>
                <span className="font-medium">4217 Magnolia Ave, Dallas TX 75215</span>
              </div>
              <div className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span className="text-[#9CA3AF]">Seller:</span>
                <span className="font-medium">John Delacroix</span>
              </div>
              <div className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span className="text-[#9CA3AF]">Contract Price:</span>
                <span className="font-medium">$260,000</span>
              </div>
              <div className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span className="text-[#9CA3AF]">Assignment Fee:</span>
                <span className="font-semibold text-[#2563EB]">$22,500</span>
              </div>
              <div className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span className="text-[#9CA3AF]">Closing Date:</span>
                <span className="font-medium">March 22, 2026</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-[#9CA3AF]">EMD Amount:</span>
                <span className="font-medium">$5,000</span>
              </div>
            </div>
            {/* Signature lines */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-[#E5E7EB]">
              <div>
                <div className="border-b border-gray-300 h-8 mb-1 flex items-end">
                  <svg width="80" height="20" viewBox="0 0 80 20" className="opacity-50 mb-0.5">
                    <path d="M2 16 C12 2, 22 18, 32 10 S42 2, 52 12 S62 18, 72 6" fill="none" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-[0.68rem] text-[#9CA3AF]">Buyer / Assignee</div>
                <div className="text-[0.72rem] text-[#374151]">Marcus Thompson</div>
              </div>
              <div>
                <div className="border-b border-gray-300 h-8 mb-1" />
                <div className="text-[0.68rem] text-[#9CA3AF]">Seller / Assignor</div>
                <div className="text-[0.72rem] text-[#374151]">John Delacroix</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4">
        <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Activity Log</div>
        <div className="space-y-2">
          {activityLog.map((a, i) => (
            <div key={i} className="flex items-center gap-3 text-[0.78rem]">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="text-[#374151]">{a.text}</span>
              <span className="text-[#9CA3AF] ml-auto whitespace-nowrap text-[0.72rem]">{a.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TEMPLATES SECTION
   ═══════════════════════════════════════════════ */
function TemplatesSection() {
  return (
    <div>
      {/* State coverage */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mini state indicators */}
          <div className="flex items-center gap-1">
            {coveredStates.map(s => (
              <span key={s} className="text-[0.66rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">{s}</span>
            ))}
          </div>
          <span className="text-[0.82rem] text-[#374151] font-medium">5 of 50 States Covered</span>
        </div>
        <div className="flex items-center gap-1.5 text-[0.76rem] text-[#9CA3AF]">
          <Lock className="w-3.5 h-3.5" />
          All 50 states available on Pro and Enterprise plans
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 contracts-template-grid">
        {templates.map(t => (
          <div key={t.id} className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-4 flex items-start justify-between hover:bg-[#F9FAFB] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#9CA3AF]" />
              </div>
              <div>
                <div className="text-[0.86rem] font-medium text-[#374151] mb-0.5">{t.name}</div>
                <div className="flex items-center gap-2 text-[0.72rem] text-[#9CA3AF]">
                  <span className={`font-medium px-1.5 py-0.5 rounded ${contractTypeBadge(t.type)} text-[0.64rem]`}>{t.type}</span>
                  <span>{t.state === 'Multi' ? 'Multi-State' : t.state}</span>
                  <span>·</span>
                  <span>Updated {t.updated}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
              <button className="text-[0.74rem] text-[#2563EB] hover:text-[#1D4ED8] bg-blue-50 hover:bg-blue-100 border-0 rounded-md px-3 py-1.5 cursor-pointer transition-colors font-medium">
                Use
              </button>
              <button className="text-[0.74rem] text-[#374151] hover:text-[#111827] bg-white hover:bg-[#F9FAFB] border border-[#D1D5DB] rounded-md px-3 py-1.5 cursor-pointer transition-colors font-medium">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ARCHIVE SECTION
   ═══════════════════════════════════════════════ */
function archiveStatusStyle(s: string) {
  switch (s) {
    case 'Executed': return 'text-emerald-700 bg-emerald-50'
    case 'Voided': return 'text-red-700 bg-red-50'
    case 'Expired': return 'text-[#6B7280] bg-gray-100'
    default: return 'text-[#6B7280] bg-gray-100'
  }
}

function ArchiveSection() {
  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-5 text-[0.78rem] text-[#9CA3AF] mb-4">
        <span><strong className="text-[#374151]">34</strong> Total Contracts</span>
        <span className="text-gray-300">|</span>
        <span><strong className="text-emerald-600">28</strong> Executed ($487,500 total fees)</span>
        <span className="text-gray-300">|</span>
        <span><strong className="text-[#374151]">4</strong> Expired</span>
        <span className="text-gray-300">|</span>
        <span><strong className="text-[#374151]">2</strong> Voided</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input type="text" placeholder="Search archived contracts..." className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-10 pr-4 py-2 text-[0.82rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] transition-colors" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input type="text" defaultValue="Nov 2025 - Mar 2026" className="bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] w-[180px]" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              {['Property Address', 'Type', 'Parties', 'Fee', 'Status', 'Date Closed', ''].map(h => (
                <th key={h} className={`px-4 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {archivedContracts.map((a, i) => (
              <tr key={a.id} className={`${i < archivedContracts.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#F9FAFB] transition-colors`}>
                <td className="px-4 py-2.5 text-[0.82rem] text-[#374151] font-medium">{a.address}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${contractTypeBadge(a.type)}`}>{a.type}</span>
                </td>
                <td className="px-4 py-2.5 text-[0.78rem] text-[#374151]">{a.parties}</td>
                <td className="px-4 py-2.5 text-[0.82rem] text-[#374151] font-medium">
                  ${a.fee.toLocaleString()}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${archiveStatusStyle(a.status)}`}>{a.status}</span>
                </td>
                <td className="px-4 py-2.5 text-sm text-[#9CA3AF]">{a.date}</td>
                <td className="px-4 py-2.5 text-right">
                  <button className="text-[0.72rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN CONTRACTS PAGE
   ═══════════════════════════════════════════════ */
export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [detailContractId, setDetailContractId] = useState<number | null>(null)
  const showDetail = detailContractId !== null

  return (
    <div className="p-8 max-w-[1200px] bg-[#FAFAFA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1
            className="text-2xl font-semibold text-[#111827] mb-1"
          >
            Contracts
          </h1>
          <p className="text-[0.84rem] text-[#9CA3AF]">
            Generate, sign, and track assignment contracts.
          </p>
        </div>
        {!showDetail && (
          <button className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-5 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors">
            <Plus className="w-4 h-4" /> Create New Contract
          </button>
        )}
      </div>

      {!showDetail && (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-6 bg-white border border-[#E5E7EB] rounded-lg px-5 py-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] text-[#374151] font-medium">7</span>
              <span className="text-[0.78rem] text-[#9CA3AF]">Active Contracts</span>
            </div>
            <div className="w-px h-4 bg-[#E5E7EB]" />
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] text-amber-600 font-medium">3</span>
              <span className="text-[0.78rem] text-[#9CA3AF]">Awaiting Signature</span>
            </div>
            <div className="w-px h-4 bg-[#E5E7EB]" />
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] text-emerald-600 font-medium">2</span>
              <span className="text-[0.78rem] text-[#9CA3AF]">Fully Executed This Month</span>
            </div>
            <div className="w-px h-4 bg-[#E5E7EB]" />
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] text-[#2563EB] font-medium">$73,500</span>
              <span className="text-[0.78rem] text-[#9CA3AF]">in Assignment Fees</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-[#E5E7EB] pb-0">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
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

          {activeTab === 'active' && <ActiveContractsSection onViewDetail={(id) => setDetailContractId(id)} />}
          {activeTab === 'templates' && <TemplatesSection />}
          {activeTab === 'archive' && <ArchiveSection />}
        </>
      )}

      {showDetail && <ContractDetail contractId={detailContractId!} onBack={() => setDetailContractId(null)} />}

      <style>{`
        @media (max-width: 900px) {
          .contracts-parties { grid-template-columns: 1fr !important; }
          .contracts-terms { grid-template-columns: 1fr !important; }
          .contracts-template-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
