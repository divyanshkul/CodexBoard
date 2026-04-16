import { CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronRight, Shield } from 'lucide-react'
import { useState } from 'react'
import type { ReviewResult } from '../types'

interface ReviewResultsProps {
  result: ReviewResult
  compact?: boolean
}

export function ReviewResults({ result, compact = false }: ReviewResultsProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const passCount = result.criteria_results.filter(c => c.status === 'pass').length
  const failCount = result.criteria_results.filter(c => c.status === 'fail').length

  const riskColors: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="space-y-3">
      {/* Criteria list */}
      <div className="space-y-1">
        {result.criteria_results.map((cr, i) => (
          <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="w-full flex items-start gap-2 text-left py-1 px-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <span className="mt-0.5 shrink-0">
                {cr.status === 'pass' && <CheckCircle2 size={14} className="text-[var(--color-success)]" />}
                {cr.status === 'fail' && <XCircle size={14} className="text-[var(--color-danger)]" />}
                {cr.status === 'unknown' && <HelpCircle size={14} className="text-[var(--color-text-muted)]" />}
              </span>
              <span className={`flex-1 text-[13px] ${cr.status === 'fail' ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
                {cr.criterion}
              </span>
              {!compact && (
                <span className="mt-0.5 shrink-0 text-[var(--color-text-muted)]">
                  {expandedIdx === i ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              )}
            </button>
            {!compact && expandedIdx === i && (
              <div className="ml-6 mb-1 text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-hover)] rounded-md p-2">
                {cr.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary bar */}
      {!compact && (
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle2 size={12} className="text-[var(--color-success)]" />
            <span className="text-[var(--color-text-secondary)]">{passCount} passed</span>
          </div>
          {failCount > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <XCircle size={12} className="text-[var(--color-danger)]" />
              <span className="text-[var(--color-text-secondary)]">{failCount} failed</span>
            </div>
          )}
          <div className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${riskColors[result.risk_level] || riskColors.low}`}>
            <Shield size={10} />
            <span className="font-medium uppercase tracking-wider">{result.risk_level}</span>
          </div>
        </div>
      )}
    </div>
  )
}
