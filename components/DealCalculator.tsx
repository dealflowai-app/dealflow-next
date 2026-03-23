'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Calculator, X, Minus, RotateCcw, Copy, GripHorizontal, Check } from 'lucide-react'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface CalcInputs {
  purchasePrice: string
  repairCosts: string
  arv: string
  assignmentFee: string
  holdingCosts: string
  holdingPeriod: string
}

interface CalcOutputs {
  mao: number
  profitMargin: number
  roi: number
  dealScore: number
}

const STORAGE_KEY = 'dealflow-calculator'

const DEFAULT_INPUTS: CalcInputs = {
  purchasePrice: '',
  repairCosts: '',
  arv: '',
  assignmentFee: '10000',
  holdingCosts: '500',
  holdingPeriod: '3',
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function num(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function calcOutputs(inputs: CalcInputs): CalcOutputs {
  const pp = num(inputs.purchasePrice)
  const rc = num(inputs.repairCosts)
  const arv = num(inputs.arv)
  const af = num(inputs.assignmentFee)
  const hc = num(inputs.holdingCosts)
  const hp = num(inputs.holdingPeriod)
  const totalHolding = hc * hp

  const mao = arv * 0.70 - rc - af
  const profitMargin = arv > 0 ? ((arv - pp - rc - totalHolding) / arv) * 100 : 0
  const totalInvested = pp + rc
  const roi = totalInvested > 0 ? ((arv - pp - rc - totalHolding) / totalInvested) * 100 : 0

  let dealScore = 0
  if (profitMargin >= 30) dealScore = 90 + Math.min(10, (profitMargin - 30) / 2)
  else if (profitMargin >= 20) dealScore = 70 + ((profitMargin - 20) / 10) * 19
  else if (profitMargin >= 10) dealScore = 50 + ((profitMargin - 10) / 10) * 19
  else if (profitMargin > 0) dealScore = (profitMargin / 10) * 49
  else dealScore = 0

  dealScore = Math.round(Math.max(0, Math.min(100, dealScore)))

  return { mao, profitMargin, roi, dealScore }
}

function dealColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 70) return { bg: 'rgba(16,185,129,0.1)', text: '#059669', label: 'Great Deal' }
  if (score >= 50) return { bg: 'rgba(245,158,11,0.1)', text: '#D97706', label: 'Okay Deal' }
  return { bg: 'rgba(239,68,68,0.1)', text: '#DC2626', label: 'Bad Deal' }
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function DealCalculator() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS)
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setInputs(JSON.parse(saved))
    } catch {}
  }, [])

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
    } catch {}
  }, [inputs])

  // Alt+C keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setOpen(o => !o)
        setMinimized(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Listen for custom toggle event from GlobalSearch
  useEffect(() => {
    function handleToggle() {
      setOpen(o => !o)
      setMinimized(false)
    }
    window.addEventListener('toggle-deal-calculator', handleToggle)
    return () => window.removeEventListener('toggle-deal-calculator', handleToggle)
  }, [])

  const updateField = useCallback((field: keyof CalcInputs, value: string) => {
    // Allow only numbers, dots, and empty string
    const cleaned = value.replace(/[^0-9.]/g, '')
    setInputs(prev => ({ ...prev, [field]: cleaned }))
  }, [])

  const resetAll = useCallback(() => {
    setInputs(DEFAULT_INPUTS)
  }, [])

  const outputs = calcOutputs(inputs)
  const color = dealColor(outputs.dealScore)
  const hasValues = num(inputs.purchasePrice) > 0 || num(inputs.arv) > 0

  const copySummary = useCallback(async () => {
    const totalHolding = num(inputs.holdingCosts) * num(inputs.holdingPeriod)
    const summary = [
      `Deal Calculator Summary`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `Purchase Price: $${fmt(num(inputs.purchasePrice))}`,
      `Repair Costs: $${fmt(num(inputs.repairCosts))}`,
      `ARV: $${fmt(num(inputs.arv))}`,
      `Assignment Fee: $${fmt(num(inputs.assignmentFee))}`,
      `Holding Costs: $${fmt(totalHolding)} (${inputs.holdingPeriod} mo @ $${fmt(num(inputs.holdingCosts))}/mo)`,
      ``,
      `MAO: $${fmt(outputs.mao)}`,
      `Profit Margin: ${outputs.profitMargin.toFixed(1)}%`,
      `ROI: ${outputs.roi.toFixed(1)}%`,
      `Deal Score: ${outputs.dealScore}/100 - ${color.label}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [inputs, outputs, color.label])

  // Drag handling
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const currentX = pos?.x ?? (window.innerWidth - 336)
    const currentY = pos?.y ?? (window.innerHeight - 480)

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: currentX,
      origY: currentY,
    }

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.origY + dy)),
      })
    }

    function onUp() {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [pos])

  const cardX = pos?.x ?? undefined
  const cardY = pos?.y ?? undefined

  const INPUT_FIELDS: { key: keyof CalcInputs; label: string; prefix?: string; suffix?: string }[] = [
    { key: 'purchasePrice', label: 'Purchase Price', prefix: '$' },
    { key: 'repairCosts', label: 'Repair Costs', prefix: '$' },
    { key: 'arv', label: 'ARV (After Repair Value)', prefix: '$' },
    { key: 'assignmentFee', label: 'Assignment Fee', prefix: '$' },
    { key: 'holdingCosts', label: 'Holding Costs', prefix: '$', suffix: '/mo' },
    { key: 'holdingPeriod', label: 'Holding Period', suffix: 'months' },
  ]

  return (
    <>
      {/* Calculator Card */}
      {open && (
        <div
          ref={cardRef}
          className="deal-calc-card"
          style={{
            position: 'fixed',
            zIndex: 160,
            width: 320,
            ...(cardX !== undefined
              ? { left: cardX, top: cardY }
              : { bottom: 88, right: 24 }),
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            animation: 'dealCalcIn 0.2s ease-out',
            fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div
            onMouseDown={onDragStart}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              cursor: 'grab',
              userSelect: 'none',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            className="deal-calc-header"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GripHorizontal style={{ width: 14, height: 14, opacity: 0.35 }} />
              <Calculator style={{ width: 15, height: 15, opacity: 0.7 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.85 }}>Deal Calculator</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => setMinimized(m => !m)}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none',
                  background: 'transparent', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
                className="deal-calc-header-btn"
              >
                <Minus style={{ width: 14, height: 14 }} />
              </button>
              <button
                onClick={() => { setOpen(false); setPos(null) }}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none',
                  background: 'transparent', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
                className="deal-calc-header-btn"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <div className="deal-calc-body" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {/* Inputs */}
              <div style={{ padding: '10px 14px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {INPUT_FIELDS.map(({ key, label, prefix, suffix }) => (
                  <div key={key}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.55, display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {label}
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      {prefix && (
                        <span className="deal-calc-input-prefix" style={{ position: 'absolute', left: 10, fontSize: '0.8rem', fontWeight: 600, opacity: 0.4, pointerEvents: 'none' }}>
                          {prefix}
                        </span>
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inputs[key]}
                        onChange={e => updateField(key, e.target.value)}
                        placeholder="0"
                        className="deal-calc-input"
                        style={{
                          width: '100%',
                          padding: `7px ${suffix ? '60px' : '10px'} 7px ${prefix ? '24px' : '10px'}`,
                          fontSize: '0.82rem',
                          fontWeight: 500,
                          borderRadius: 8,
                          border: 'none',
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                      {suffix && (
                        <span style={{ position: 'absolute', right: 10, fontSize: '0.68rem', fontWeight: 500, opacity: 0.35, pointerEvents: 'none' }}>
                          {suffix}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="deal-calc-divider" style={{ margin: '8px 14px', height: 1 }} />

              {/* Outputs */}
              {hasValues && (
                <div style={{ padding: '6px 14px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Deal Score Banner */}
                  <div style={{
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }} className="deal-calc-score-banner" data-quality={outputs.dealScore >= 70 ? 'good' : outputs.dealScore >= 50 ? 'okay' : 'bad'}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                        Deal Score
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>
                        {outputs.dealScore}
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.6 }}>/100</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 20,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }} className="deal-calc-score-badge" data-quality={outputs.dealScore >= 70 ? 'good' : outputs.dealScore >= 50 ? 'okay' : 'bad'}>
                      {color.label}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div className="deal-calc-metric" style={{ borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>MAO</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>${fmt(outputs.mao)}</div>
                    </div>
                    <div className="deal-calc-metric" style={{ borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profit Margin</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{outputs.profitMargin.toFixed(1)}%</div>
                    </div>
                    <div className="deal-calc-metric" style={{ borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ROI</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{outputs.roi.toFixed(1)}%</div>
                    </div>
                    <div className="deal-calc-metric" style={{ borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Holding</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>${fmt(num(inputs.holdingCosts) * num(inputs.holdingPeriod))}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ padding: '6px 14px 12px', display: 'flex', gap: 8 }}>
                <button
                  onClick={resetAll}
                  className="deal-calc-action-btn"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 0',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'opacity 0.1s',
                  }}
                >
                  <RotateCcw style={{ width: 13, height: 13 }} />
                  Reset
                </button>
                <button
                  onClick={copySummary}
                  className="deal-calc-copy-btn"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 0',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    transition: 'opacity 0.1s',
                  }}
                >
                  {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                  {copied ? 'Copied!' : 'Copy Summary'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dealCalcIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Light mode */
        .deal-calc-card {
          background: #ffffff;
          color: #0B1224;
        }
        .deal-calc-header {
          background: rgba(255,255,255,0.8);
          border-bottom: 1px solid rgba(5,14,36,0.06);
          color: #0B1224;
        }
        .deal-calc-header-btn {
          color: rgba(5,14,36,0.4);
        }
        .deal-calc-header-btn:hover {
          background: rgba(5,14,36,0.06) !important;
          color: rgba(5,14,36,0.7);
        }
        .deal-calc-input {
          background: rgba(5,14,36,0.04);
          color: #0B1224;
        }
        .deal-calc-input::placeholder { color: rgba(5,14,36,0.2); }
        .deal-calc-input:focus {
          box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
          background: rgba(37,99,235,0.04);
        }
        .deal-calc-divider { background: rgba(5,14,36,0.06); }
        .deal-calc-metric { background: rgba(5,14,36,0.03); }

        .deal-calc-score-banner[data-quality="good"] { background: rgba(16,185,129,0.1); color: #059669; }
        .deal-calc-score-banner[data-quality="okay"] { background: rgba(245,158,11,0.1); color: #D97706; }
        .deal-calc-score-banner[data-quality="bad"] { background: rgba(239,68,68,0.1); color: #DC2626; }

        .deal-calc-score-badge[data-quality="good"] { background: rgba(16,185,129,0.15); color: #059669; }
        .deal-calc-score-badge[data-quality="okay"] { background: rgba(245,158,11,0.15); color: #D97706; }
        .deal-calc-score-badge[data-quality="bad"] { background: rgba(239,68,68,0.15); color: #DC2626; }

        .deal-calc-action-btn {
          background: rgba(5,14,36,0.05);
          color: rgba(5,14,36,0.6);
        }
        .deal-calc-action-btn:hover { opacity: 0.8; }
        .deal-calc-copy-btn {
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
        }
        .deal-calc-copy-btn:hover { opacity: 0.9; }

        .deal-calc-body::-webkit-scrollbar { width: 4px; }
        .deal-calc-body::-webkit-scrollbar-track { background: transparent; }
        .deal-calc-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
      `}} />
    </>
  )
}
