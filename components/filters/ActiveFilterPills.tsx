'use client'

import { X } from 'lucide-react'

interface ActiveFilterPillsProps {
  filters: { key: string; label: string; value: string; displayValue: string }[]
  onRemove: (key: string) => void
  onClearAll: () => void
}

export default function ActiveFilterPills({ filters, onRemove, onClearAll }: ActiveFilterPillsProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1 bg-[rgba(37,99,235,0.08)] text-[#2563EB] rounded-full px-2.5 py-1 text-[0.74rem] font-medium"
        >
          <span className="text-[rgba(37,99,235,0.5)]">{f.label}:</span>
          {f.displayValue}
          <button
            onClick={() => onRemove(f.key)}
            className="ml-0.5 p-0 bg-transparent border-0 cursor-pointer text-[#2563EB] hover:text-[#1D4ED8] transition-colors flex items-center"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-[0.74rem] text-[rgba(5,14,36,0.35)] hover:text-red-500 bg-transparent border-0 cursor-pointer transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
