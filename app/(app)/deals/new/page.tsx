'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, DollarSign, Home, Calendar, FileText,
  ChevronDown, ChevronUp, Loader2, TrendingUp, TrendingDown,
  AlertTriangle,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const PROPERTY_TYPES = [
  { value: 'SFR', label: 'SFR' },
  { value: 'MULTI_FAMILY', label: 'Multi-Family' },
  { value: 'CONDO', label: 'Condo' },
  { value: 'LAND', label: 'Land' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MOBILE_HOME', label: 'Mobile Home' },
]

const CONDITIONS = [
  { value: 'distressed', label: 'Distressed' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
]

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function parseCurrency(s: string): number | null {
  const cleaned = s.replace(/[^0-9]/g, '')
  if (!cleaned) return null
  return parseInt(cleaned, 10)
}

function fmtNumber(n: number): string {
  return n.toLocaleString()
}

function handleCurrencyInput(setter: (v: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (!raw) { setter(''); return }
    setter(parseInt(raw, 10).toLocaleString())
  }
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function NewDealPage() {
  const router = useRouter()

  // Form state
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [propertyType, setPropertyType] = useState('SFR')

  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [sqft, setSqft] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')
  const [condition, setCondition] = useState('')

  const [askingPrice, setAskingPrice] = useState('')
  const [assignFee, setAssignFee] = useState('')
  const [arv, setArv] = useState('')
  const [repairCost, setRepairCost] = useState('')
  const [closeByDate, setCloseByDate] = useState('')

  const [notes, setNotes] = useState('')

  const [detailsOpen, setDetailsOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Daisy chain / duplicate state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [existingDealId, setExistingDealId] = useState<string | null>(null)
  const [existingDealStatus, setExistingDealStatus] = useState<string | null>(null)

  // Live calculations
  const askingNum = parseCurrency(askingPrice)
  const arvNum = parseCurrency(arv)
  const repairNum = parseCurrency(repairCost)
  const feeNum = parseCurrency(assignFee)

  const spread = arvNum != null && askingNum != null ? arvNum - askingNum : null
  const spreadPct = arvNum != null && askingNum != null && arvNum > 0
    ? ((arvNum - askingNum) / arvNum * 100).toFixed(1)
    : null
  const flipProfit = arvNum != null && askingNum != null
    ? arvNum - askingNum - (repairNum || 0) - (feeNum || 0)
    : null

  // Inline validation — clears errors as user corrects them
  function validateField(field: string, value: string | number | null): string | null {
    switch (field) {
      case 'address': return !value || !(value as string).trim() ? 'Address is required' : null
      case 'city': return !value || !(value as string).trim() ? 'City is required' : null
      case 'state': return !value ? 'State is required' : null
      case 'zip': return !value || !(value as string).trim() ? 'Zip is required' : null
      case 'askingPrice': return !value || (value as number) <= 0 ? 'Asking price is required' : null
      default: return null
    }
  }

  function handleBlur(field: string, value: string | number | null) {
    const err = validateField(field, value)
    setErrors(prev => {
      const next = { ...prev }
      if (err) next[field] = err
      else delete next[field]
      return next
    })
  }

  // Full validation on submit
  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!address.trim()) errs.address = 'Address is required'
    if (!city.trim()) errs.city = 'City is required'
    if (!state) errs.state = 'State is required'
    if (!zip.trim()) errs.zip = 'Zip is required'
    if (!askingNum || askingNum <= 0) errs.askingPrice = 'Asking price is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Submit
  async function submit(status: 'ACTIVE' | 'DRAFT', force?: boolean) {
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)

    const body: Record<string, unknown> = {
      address: address.trim(),
      city: city.trim(),
      state,
      zip: zip.trim(),
      propertyType,
      askingPrice: askingNum,
      status,
    }

    if (beds) body.beds = parseInt(beds, 10)
    if (baths) body.baths = parseFloat(baths)
    if (sqft) body.sqft = parseInt(sqft, 10)
    if (yearBuilt) body.yearBuilt = parseInt(yearBuilt, 10)
    if (condition) body.condition = condition
    if (feeNum != null) body.assignFee = feeNum
    if (arvNum != null) body.arv = arvNum
    if (repairNum != null) body.repairCost = repairNum
    if (closeByDate) body.closeByDate = closeByDate
    if (notes.trim()) body.notes = notes.trim()
    if (force) body.force = true

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      // Handle same-wholesaler duplicate (409 with requiresForce)
      if (res.status === 409 && data.requiresForce) {
        setDuplicateWarning(data.warning || 'You already have a deal at this address.')
        setExistingDealId(data.existingDealId || null)
        setExistingDealStatus(data.existingDealStatus || null)
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create deal')
      }

      // Store daisy chain warning in sessionStorage for the detail page to pick up
      if (data.daisyChainWarning) {
        try {
          sessionStorage.setItem(`daisy_chain_${data.deal.id}`, data.daisyChainWarning)
        } catch { /* ignore storage errors */ }
      }

      router.push(`/deals/${data.deal.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Force-create after duplicate warning
  function forceSubmit(status: 'ACTIVE' | 'DRAFT') {
    setDuplicateWarning(null)
    setExistingDealId(null)
    setExistingDealStatus(null)
    submit(status, true)
  }

  // Input styling
  const inputBase = 'w-full bg-white rounded-[8px] px-3 py-2.5 text-[0.82rem] text-gray-700 outline-none transition-colors'
  const inputBorderStyle = { border: '1px solid rgba(5,14,36,0.15)' }
  const inputErrorBorderStyle = { border: '1px solid #fca5a5' }
  const onInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }
  const onInputBlurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = 'rgba(5,14,36,0.15)'; e.currentTarget.style.boxShadow = 'none' }
  const inputFocusHandlers = { onFocus: onInputFocus, onBlur: onInputBlurStyle }
  function inputCls(field?: string) {
    return inputBase
  }
  function inputStyle(field?: string) {
    return field && errors[field] ? inputErrorBorderStyle : inputBorderStyle
  }

  return (
    <div className="p-4 sm:p-9 max-w-[780px]">
      {/* Header */}
      <button
        onClick={() => router.push('/deals')}
        className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> My Deals
      </button>

      <div className="mb-6">
        <h1
          style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: 24, color: '#0B1224', letterSpacing: '-0.02em' }}
          className="mb-1"
        >
          Submit New Deal
        </h1>
        <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: 14, color: 'rgba(5,14,36,0.5)' }}>
          Enter a property you have under contract to match it with buyers.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-[10px]" style={{ border: '1px solid rgba(5,14,36,0.06)' }}>

        {/* Section 1: Property Address */}
        <div className="px-5 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5" /> Property Address
          </div>

          <div className="mb-3">
            <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Address <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className={inputCls('address')}
              style={inputStyle('address')}
              onFocus={onInputFocus}
              onBlur={(e) => { onInputBlurStyle(e); handleBlur('address', address) }}
            />
            {errors.address && <span className="text-[0.7rem] text-red-500 mt-0.5 block">{errors.address}</span>}
          </div>

          <div className="grid gap-3 new-deal-address-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
            <div>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">City <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dallas"
                className={inputCls('city')}
                style={inputStyle('city')}
                onFocus={onInputFocus}
                onBlur={(e) => { onInputBlurStyle(e); handleBlur('city', city) }}
              />
              {errors.city && <span className="text-[0.7rem] text-red-500 mt-0.5 block">{errors.city}</span>}
            </div>
            <div>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">State <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={`appearance-none ${inputCls('state')} pr-8 cursor-pointer`}
                  style={inputStyle('state')}
                  onFocus={onInputFocus}
                  onBlur={(e) => { onInputBlurStyle(e); handleBlur('state', state) }}
                >
                  <option value="">—</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              {errors.state && <span className="text-[0.7rem] text-red-500 mt-0.5 block">{errors.state}</span>}
            </div>
            <div>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Zip <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="75216"
                maxLength={10}
                className={inputCls('zip')}
                style={inputStyle('zip')}
                onFocus={onInputFocus}
                onBlur={(e) => { onInputBlurStyle(e); handleBlur('zip', zip) }}
              />
              {errors.zip && <span className="text-[0.7rem] text-red-500 mt-0.5 block">{errors.zip}</span>}
            </div>
          </div>

          <div className="mt-3" style={{ maxWidth: 220 }}>
            <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Property Type</label>
            <div className="relative">
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className={`appearance-none ${inputBase} pr-8 cursor-pointer`}
                style={inputBorderStyle}
              >
                {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Section 2: Property Details (collapsible, open by default) */}
        <div>
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-0 cursor-pointer text-left"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Property Details
            </div>
            {detailsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {detailsOpen && (
            <div className="px-5 pb-5 pt-0">
              <div className="grid gap-3 new-deal-details-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                <div>
                  <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Beds</label>
                  <input
                    type="number"
                    value={beds}
                    onChange={(e) => setBeds(e.target.value)}
                    placeholder="3"
                    min="0"
                    className={`${inputBase}`}
                    style={inputBorderStyle}
                    {...inputFocusHandlers}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Baths</label>
                  <input
                    type="number"
                    value={baths}
                    onChange={(e) => setBaths(e.target.value)}
                    placeholder="2"
                    min="0"
                    step="0.5"
                    className={`${inputBase}`}
                    style={inputBorderStyle}
                    {...inputFocusHandlers}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Sq Ft</label>
                  <input
                    type="number"
                    value={sqft}
                    onChange={(e) => setSqft(e.target.value)}
                    placeholder="1750"
                    min="0"
                    className={`${inputBase}`}
                    style={inputBorderStyle}
                    {...inputFocusHandlers}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Year Built</label>
                  <input
                    type="number"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                    placeholder="1978"
                    min="1800"
                    max="2030"
                    className={`${inputBase}`}
                    style={inputBorderStyle}
                    {...inputFocusHandlers}
                  />
                </div>
              </div>
              <div className="mt-3" style={{ maxWidth: 220 }}>
                <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Condition</label>
                <div className="relative">
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className={`appearance-none ${inputBase} pr-8 cursor-pointer`}
                    style={inputBorderStyle}
                  >
                    <option value="">Not specified</option>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Section 3: Deal Financials */}
        <div className="px-5 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] mb-4 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Deal Financials
          </div>

          <div className="grid grid-cols-2 gap-3 new-deal-financials-grid">
            <div>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Asking Price <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={askingPrice}
                  onChange={handleCurrencyInput(setAskingPrice)}
                  placeholder="142,000"
                  className={`${inputCls('askingPrice')} pl-7`}
                  style={inputStyle('askingPrice')}
                  onFocus={onInputFocus}
                  onBlur={(e) => { onInputBlurStyle(e); handleBlur('askingPrice', askingNum) }}
                />
              </div>
              {errors.askingPrice && <span className="text-[0.7rem] text-red-500 mt-0.5 block">{errors.askingPrice}</span>}
            </div>
            <div>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Assignment Fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={assignFee}
                  onChange={handleCurrencyInput(setAssignFee)}
                  placeholder="25,000"
                  className={`${inputBase} pl-7`}
                  style={inputBorderStyle}
                  {...inputFocusHandlers}
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">ARV (After Repair Value)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={arv}
                  onChange={handleCurrencyInput(setArv)}
                  placeholder="245,000"
                  className={`${inputBase} pl-7`}
                  style={inputBorderStyle}
                  {...inputFocusHandlers}
                />
              </div>
              <span className="text-[0.66rem] text-gray-400 mt-0.5 block">What you estimate the property is worth after repairs</span>
            </div>
            <div>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block">Repair Cost Estimate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={repairCost}
                  onChange={handleCurrencyInput(setRepairCost)}
                  placeholder="38,000"
                  className={`${inputBase} pl-7`}
                  style={inputBorderStyle}
                  {...inputFocusHandlers}
                />
              </div>
            </div>
            <div className="col-span-2 new-deal-date-field" style={{ maxWidth: 220 }}>
              <label className="text-[12px] text-[rgba(5,14,36,0.4)] mb-1 block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Close-by Date
              </label>
              <input
                type="date"
                value={closeByDate}
                onChange={(e) => setCloseByDate(e.target.value)}
                className={`${inputBase} cursor-pointer`}
                style={inputBorderStyle}
                {...inputFocusHandlers}
              />
            </div>
          </div>

          {/* Live calculation summary */}
          {(spread != null || flipProfit != null) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid gap-3 new-deal-calc-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {spread != null && (
                  <div className="bg-gray-50 rounded-[8px] px-3.5 py-3">
                    <div className="text-[0.68rem] text-gray-400 uppercase tracking-wide mb-1">Spread</div>
                    <div className={`text-[0.92rem] font-semibold flex items-center gap-1 ${spread >= 0 ? 'text-[#2563EB]' : 'text-[#EF4444]'}`}>
                      {spread >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      ${fmtNumber(Math.abs(spread))}
                    </div>
                  </div>
                )}
                {spreadPct != null && (
                  <div className="bg-gray-50 rounded-[8px] px-3.5 py-3">
                    <div className="text-[0.68rem] text-gray-400 uppercase tracking-wide mb-1">Spread %</div>
                    <div className={`text-[0.92rem] font-semibold ${parseFloat(spreadPct) >= 0 ? 'text-[#2563EB]' : 'text-[#EF4444]'}`}>
                      {spreadPct}%
                    </div>
                  </div>
                )}
                {flipProfit != null && (
                  <div className="bg-gray-50 rounded-[8px] px-3.5 py-3">
                    <div className="text-[0.68rem] text-gray-400 uppercase tracking-wide mb-1">Est. Flip Profit</div>
                    <div className={`text-[0.92rem] font-semibold ${flipProfit >= 0 ? 'text-[#2563EB]' : 'text-[#EF4444]'}`}>
                      {flipProfit >= 0 ? '' : '-'}${fmtNumber(Math.abs(flipProfit))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Section 4: Notes (collapsible, closed by default) */}
        <div>
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-0 cursor-pointer text-left"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Notes
            </div>
            {notesOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {notesOpen && (
            <div className="px-5 pb-5 pt-0">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Any additional notes about this deal (motivation, timeline, seller context, etc.)"
                className={`${inputBase} resize-y`}
                style={inputBorderStyle}
                {...inputFocusHandlers}
              />
            </div>
          )}
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="mt-4 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-[8px]">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[0.82rem] font-medium text-amber-800 mb-1">Duplicate address detected</div>
              <div className="text-[0.78rem] text-amber-700 mb-2.5">{duplicateWarning}</div>
              <div className="flex items-center gap-3">
                {existingDealId && (
                  <Link
                    href={`/deals/${existingDealId}`}
                    className="text-[0.78rem] font-medium text-amber-800 no-underline hover:underline"
                  >
                    View existing deal{existingDealStatus ? ` (${existingDealStatus.replace(/_/g, ' ')})` : ''} →
                  </Link>
                )}
                <button
                  onClick={() => forceSubmit('ACTIVE')}
                  disabled={submitting}
                  className="text-[0.78rem] font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md px-3 py-1 cursor-pointer transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Create anyway'}
                </button>
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="text-[0.78rem] text-amber-600 bg-transparent border-0 cursor-pointer hover:text-amber-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[8px] text-[0.82rem] text-red-700">
          {submitError}
        </div>
      )}

      {/* Action bar */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => submit('ACTIVE')}
          disabled={submitting}
          className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-5 py-2.5 text-[0.84rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Deal
        </button>
        <button
          onClick={() => submit('DRAFT')}
          disabled={submitting}
          className="flex items-center gap-1.5 bg-white hover:bg-[#F9FAFB] text-[#374151] rounded-[8px] px-5 py-2.5 text-[0.84rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: '1px solid rgba(5,14,36,0.15)' }}
        >
          Save as Draft
        </button>
        <Link
          href="/deals"
          className="text-[0.82rem] text-gray-500 no-underline hover:text-gray-700 transition-colors ml-1"
        >
          Cancel
        </Link>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 680px) {
          .new-deal-address-grid { grid-template-columns: 1fr !important; }
          .new-deal-details-grid { grid-template-columns: 1fr 1fr !important; }
          .new-deal-financials-grid { grid-template-columns: 1fr !important; }
          .new-deal-calc-grid { grid-template-columns: 1fr !important; }
          .new-deal-date-field { max-width: none !important; }
        }
        @media (max-width: 480px) {
          .new-deal-details-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  )
}
