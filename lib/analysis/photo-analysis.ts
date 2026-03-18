/**
 * Photo Condition Analysis Types
 *
 * Types for the AI-powered property condition assessment
 * using Claude's vision capabilities.
 */

export interface PhotoRepairItem {
  item: string
  urgency: 'high' | 'medium' | 'low'
  estimatedCost: string
}

export interface PhotoAssessment {
  description: string
  area: string
  condition: string
  issues: string[]
  repairItems: PhotoRepairItem[]
}

export interface PhotoAnalysis {
  photos: PhotoAssessment[]
  overallCondition: string // "excellent" | "good" | "fair" | "poor" | "distressed"
  overallConditionScore: number // 0-100 (100 = perfect condition)
  majorIssues: string[]
  estimatedRepairTotal: { low: number; mid: number; high: number }
  conditionSummary: string
  confidenceNote: string
  analyzedAt: string
}
