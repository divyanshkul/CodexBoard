import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { PlanStep } from '../types'

interface PlanProgressProps {
  plan: PlanStep[]
  compact?: boolean
}

export function PlanProgress({ plan, compact = false }: PlanProgressProps) {
  if (!plan || plan.length === 0) return null

  const completed = plan.filter(s => s.status === 'completed').length
  const pct = Math.round((completed / plan.length) * 100)

  return (
    <div className="space-y-1.5">
      {plan.map((step, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-[13px]'} animate-fade-in`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span className="mt-0.5 shrink-0">
            {step.status === 'completed' && (
              <CheckCircle2 size={compact ? 13 : 15} className="text-[var(--color-success)]" />
            )}
            {step.status === 'inProgress' && (
              <Loader2 size={compact ? 13 : 15} className="text-[var(--color-warning)] animate-spin-slow" />
            )}
            {step.status === 'pending' && (
              <Circle size={compact ? 13 : 15} className="text-[var(--color-text-muted)]" />
            )}
          </span>
          <span
            className={
              step.status === 'completed'
                ? 'text-[var(--color-text-secondary)] line-through decoration-[var(--color-border)]'
                : step.status === 'inProgress'
                  ? 'text-[var(--color-text-primary)] font-medium'
                  : 'text-[var(--color-text-muted)]'
            }
          >
            {step.step}
          </span>
        </div>
      ))}

      {/* Progress bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[var(--color-border-light)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-warning)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
          {pct}%
        </span>
      </div>
    </div>
  )
}
