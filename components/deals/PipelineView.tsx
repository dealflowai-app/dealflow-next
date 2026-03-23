'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import { GripVertical, Loader2 } from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
type Deal = {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  askingPrice: number
  arv: number | null
  status: string
  createdAt: string
  closedAt: string | null
  matches: { id: string; matchScore: number }[]
  offers: { id: string; status: string; amount: number }[]
}

type PipelineColumn = {
  key: string
  label: string
  colorClass: string
  headerBg: string
  headerText: string
  dotColor: string
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */
const COLUMNS: PipelineColumn[] = [
  {
    key: 'DRAFT',
    label: 'Draft',
    colorClass: 'pipeline-col-draft',
    headerBg: 'rgba(107,114,128,0.08)',
    headerText: '#6b7280',
    dotColor: '#9ca3af',
  },
  {
    key: 'ACTIVE',
    label: 'Active',
    colorClass: 'pipeline-col-active',
    headerBg: 'rgba(37,99,235,0.08)',
    headerText: '#2563EB',
    dotColor: '#2563EB',
  },
  {
    key: 'UNDER_OFFER',
    label: 'Under Offer',
    colorClass: 'pipeline-col-under-offer',
    headerBg: 'rgba(217,119,6,0.08)',
    headerText: '#d97706',
    dotColor: '#d97706',
  },
  {
    key: 'CLOSED',
    label: 'Closed',
    colorClass: 'pipeline-col-closed',
    headerBg: 'rgba(22,163,74,0.08)',
    headerText: '#16a34a',
    dotColor: '#16a34a',
  },
  {
    key: 'CANCELLED',
    label: 'Cancelled',
    colorClass: 'pipeline-col-cancelled',
    headerBg: 'rgba(239,68,68,0.08)',
    headerText: '#ef4444',
    dotColor: '#ef4444',
  },
]

const typeLabels: Record<string, string> = {
  SFR: 'SFR',
  MULTI_FAMILY: 'Multi-Family',
  CONDO: 'Condo',
  LAND: 'Land',
  COMMERCIAL: 'Commercial',
  MOBILE_HOME: 'Mobile Home',
}

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

/* ═══════════════════════════════════════════════
   PIPELINE VIEW COMPONENT
   ═══════════════════════════════════════════════ */
export default function PipelineView({
  deals,
  onDealsChange,
}: {
  deals: Deal[]
  onDealsChange: () => void
}) {
  const router = useRouter()
  const toast = useToast()

  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const dragCounter = useRef<Record<string, number>>({})

  /* ── Group deals by status ── */
  const columnDeals: Record<string, Deal[]> = {}
  for (const col of COLUMNS) {
    columnDeals[col.key] = deals.filter((d) => d.status === col.key)
  }

  /* ── Drag handlers ── */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dealId: string) => {
      setDraggedDealId(dealId)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', dealId)
      // Make the dragged element semi-transparent
      requestAnimationFrame(() => {
        const el = e.currentTarget
        if (el) el.style.opacity = '0.4'
      })
    },
    [],
  )

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.style.opacity = '1'
      setDraggedDealId(null)
      setDragOverColumn(null)
      dragCounter.current = {}
    },
    [],
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>, columnKey: string) => {
      e.preventDefault()
      if (!dragCounter.current[columnKey]) dragCounter.current[columnKey] = 0
      dragCounter.current[columnKey]++
      setDragOverColumn(columnKey)
    },
    [],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>, columnKey: string) => {
      e.preventDefault()
      if (!dragCounter.current[columnKey]) dragCounter.current[columnKey] = 0
      dragCounter.current[columnKey]--
      if (dragCounter.current[columnKey] <= 0) {
        dragCounter.current[columnKey] = 0
        if (dragOverColumn === columnKey) {
          setDragOverColumn(null)
        }
      }
    },
    [dragOverColumn],
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, targetColumn: string) => {
      e.preventDefault()
      setDragOverColumn(null)
      dragCounter.current = {}

      const dealId = e.dataTransfer.getData('text/plain')
      if (!dealId) return

      const deal = deals.find((d) => d.id === dealId)
      if (!deal || deal.status === targetColumn) {
        setDraggedDealId(null)
        return
      }

      setDraggedDealId(null)
      setUpdatingId(dealId)

      try {
        const res = await fetch(`/api/deals/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetColumn }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update status')
        }
        toast(`Moved to ${targetColumn.replace(/_/g, ' ')}`)
        onDealsChange()
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to update status')
      } finally {
        setUpdatingId(null)
      }
    },
    [deals, onDealsChange, toast],
  )

  return (
    <>
      <div className="pipeline-board">
        {COLUMNS.map((col) => {
          const colDeals = columnDeals[col.key] || []
          const isOver = dragOverColumn === col.key && draggedDealId !== null
          const draggedDeal = draggedDealId ? deals.find((d) => d.id === draggedDealId) : null
          const isDragSourceColumn = draggedDeal?.status === col.key

          return (
            <div
              key={col.key}
              className={`pipeline-column ${isOver && !isDragSourceColumn ? 'pipeline-column-drag-over' : ''}`}
              onDragEnter={(e) => handleDragEnter(e, col.key)}
              onDragOver={handleDragOver}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
              style={{
                borderColor: isOver && !isDragSourceColumn ? col.headerText : undefined,
              }}
            >
              {/* Column header */}
              <div
                className="pipeline-column-header"
                style={{
                  background: col.headerBg,
                  fontFamily: FONT,
                }}
              >
                <span
                  className="pipeline-dot"
                  style={{ background: col.dotColor }}
                />
                <span
                  className="pipeline-column-title"
                  style={{ color: col.headerText }}
                >
                  {col.label}
                </span>
                <span
                  className="pipeline-column-count"
                  style={{ color: col.headerText }}
                >
                  {colDeals.length}
                </span>
              </div>

              {/* Cards area */}
              <div className="pipeline-cards">
                {colDeals.length === 0 ? (
                  <div className="pipeline-empty">
                    <span style={{ fontFamily: FONT }}>No deals</span>
                  </div>
                ) : (
                  colDeals.map((deal) => {
                    const isUpdating = updatingId === deal.id
                    return (
                      <div
                        key={deal.id}
                        draggable={!isUpdating}
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => router.push(`/deals/${deal.id}`)}
                        className={`pipeline-card ${draggedDealId === deal.id ? 'pipeline-card-dragging' : ''} ${isUpdating ? 'pipeline-card-updating' : ''}`}
                        style={{ fontFamily: FONT }}
                      >
                        {isUpdating && (
                          <div className="pipeline-card-loader">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        )}

                        <div className="pipeline-card-header">
                          <GripVertical className="pipeline-grip" />
                          <div className="pipeline-card-address">
                            {deal.address}
                          </div>
                        </div>

                        <div className="pipeline-card-location">
                          {deal.city}, {deal.state}
                        </div>

                        <div className="pipeline-card-row">
                          <div className="pipeline-card-price">
                            ${deal.askingPrice.toLocaleString()}
                          </div>
                          {deal.arv != null && (
                            <div className="pipeline-card-arv">
                              ARV ${deal.arv.toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="pipeline-card-footer">
                          <span className="pipeline-card-type-badge">
                            {typeLabels[deal.propertyType] || deal.propertyType}
                          </span>
                          {deal.matches.length > 0 && (
                            <span className="pipeline-card-matches">
                              {deal.matches.length} match{deal.matches.length !== 1 ? 'es' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .pipeline-board {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          min-height: 400px;
          -webkit-overflow-scrolling: touch;
        }

        .pipeline-column {
          flex: 0 0 260px;
          min-width: 260px;
          background: #fff;
          border-radius: 10px;
          border: 2px solid rgba(5,14,36,0.06);
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          max-height: calc(100vh - 320px);
        }

        .pipeline-column-drag-over {
          box-shadow: 0 0 0 1px currentColor inset, 0 4px 16px rgba(0,0,0,0.08);
        }

        .pipeline-column-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid rgba(5,14,36,0.04);
          flex-shrink: 0;
        }

        .pipeline-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .pipeline-column-title {
          font-weight: 600;
          font-size: 13px;
          letter-spacing: -0.005em;
        }

        .pipeline-column-count {
          margin-left: auto;
          font-weight: 700;
          font-size: 12px;
          opacity: 0.7;
        }

        .pipeline-cards {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pipeline-cards::-webkit-scrollbar {
          width: 4px;
        }
        .pipeline-cards::-webkit-scrollbar-thumb {
          background: rgba(5,14,36,0.1);
          border-radius: 2px;
        }
        .pipeline-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 12px;
          color: rgba(5,14,36,0.25);
          font-size: 12px;
        }

        .pipeline-card {
          background: #fff;
          border: 1px solid rgba(5,14,36,0.06);
          border-radius: 8px;
          padding: 10px 12px;
          cursor: grab;
          transition: box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
          position: relative;
          user-select: none;
        }

        .pipeline-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .pipeline-card-dragging {
          opacity: 0.4;
        }

        .pipeline-card-updating {
          pointer-events: none;
          opacity: 0.6;
        }

        .pipeline-card-loader {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.7);
          border-radius: 8px;
          z-index: 2;
          color: #2563EB;
        }

        .pipeline-card-header {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          margin-bottom: 2px;
        }

        .pipeline-grip {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          color: rgba(5,14,36,0.18);
          margin-top: 1px;
        }

        .pipeline-card-address {
          font-weight: 600;
          font-size: 13px;
          color: #0B1224;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }

        .pipeline-card-location {
          font-size: 11.5px;
          color: rgba(5,14,36,0.4);
          margin-bottom: 8px;
          padding-left: 18px;
        }

        .pipeline-card-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
        }

        .pipeline-card-price {
          font-weight: 700;
          font-size: 14px;
          color: #0B1224;
          letter-spacing: -0.02em;
        }

        .pipeline-card-arv {
          font-size: 11px;
          color: rgba(5,14,36,0.38);
          font-weight: 500;
        }

        .pipeline-card-footer {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pipeline-card-type-badge {
          display: inline-block;
          padding: 1px 7px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          background: rgba(37,99,235,0.06);
          color: #2563EB;
        }

        .pipeline-card-matches {
          font-size: 10.5px;
          color: rgba(5,14,36,0.35);
          font-weight: 500;
        }

        @media (max-width: 800px) {
          .pipeline-column {
            flex: 0 0 220px;
            min-width: 220px;
          }
        }
      ` }} />
    </>
  )
}
