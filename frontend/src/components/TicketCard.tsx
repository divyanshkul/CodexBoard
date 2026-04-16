import { useState, useEffect } from 'react'
import {
  Play, RotateCcw, Check, X, Clock, Camera, Film, FileText, Grid3x3,
  ChevronRight, AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react'
import type { Ticket } from '../types'
import { formatDuration, formatElapsed, relativeTime, truncateRepo, cn } from '../lib/utils'
import { PlanProgress } from './PlanProgress'
import { DiffSummary } from './DiffSummary'
import { ReviewResults } from './ReviewResults'

interface TicketCardProps {
  ticket: Ticket
  onStartBuild: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string, feedback: string) => void
  onClick: (ticket: Ticket) => void
}

const outputIcons = [
  { key: 'screenshots', icon: Camera, label: 'Screenshots' },
  { key: 'pixel_diff', icon: Grid3x3, label: 'Pixel diff' },
  { key: 'video', icon: Film, label: 'Video' },
  { key: 'markdown', icon: FileText, label: 'Markdown' },
] as const

function ElapsedTimer({ startIso }: { startIso: string }) {
  const [elapsed, setElapsed] = useState(formatElapsed(startIso))
  useEffect(() => {
    const interval = setInterval(() => setElapsed(formatElapsed(startIso)), 1000)
    return () => clearInterval(interval)
  }, [startIso])
  return (
    <span className="text-xs font-mono text-[var(--color-status-progress)] tabular-nums flex items-center gap-1">
      <Clock size={11} />
      {elapsed}
    </span>
  )
}

export function TicketCard({ ticket, onStartBuild, onApprove, onReject, onClick }: TicketCardProps) {
  const [rejectMode, setRejectMode] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const borderColors: Record<string, string> = {
    todo: 'border-l-[var(--color-status-todo)]',
    in_progress: 'border-l-[var(--color-status-progress)]',
    review: 'border-l-[var(--color-status-review)]',
    done: 'border-l-[var(--color-status-done)]',
    failed: 'border-l-[var(--color-status-failed)]',
  }

  const enabledOutputs = outputIcons.filter(
    o => ticket.output_preferences[o.key as keyof typeof ticket.output_preferences]
  )

  const handleAction = async (action: () => Promise<void> | void) => {
    setLoading(true)
    try {
      await action()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg',
        'border-l-[3px] cursor-pointer transition-all duration-150',
        'hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[var(--color-border)]',
        borderColors[ticket.status],
        ticket.status === 'in_progress' && 'animate-pulse-border',
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, textarea, input')) return
        onClick(ticket)
      }}
    >
      <div className="p-3 space-y-2.5">
        {/* Header: ID + meta */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-medium text-[var(--color-text-muted)] uppercase">
            {ticket.id.slice(0, 8)}
          </span>
          {ticket.status === 'in_progress' && ticket.build_started_at && (
            <ElapsedTimer startIso={ticket.build_started_at} />
          )}
          {ticket.status === 'review' && ticket.build_duration_seconds && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Built in {formatDuration(ticket.build_duration_seconds)}
            </span>
          )}
          {ticket.status === 'done' && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-status-done)] font-medium">
              <CheckCircle2 size={12} />
              Done
            </span>
          )}
          {ticket.status === 'failed' && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-status-failed)] font-medium">
              <AlertTriangle size={12} />
              Failed
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
          {ticket.title}
        </h3>

        {/* === STATUS-SPECIFIC CONTENT === */}

        {/* TODO */}
        {ticket.status === 'todo' && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded">
                {ticket.acceptance_criteria.length} criteria
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded truncate max-w-[140px]">
                {truncateRepo(ticket.target_repo)}
              </span>
            </div>
            {enabledOutputs.length > 0 && (
              <div className="flex items-center gap-1.5">
                {enabledOutputs.map(o => (
                  <o.icon key={o.key} size={12} className="text-[var(--color-text-muted)]" aria-label={o.label} />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {relativeTime(ticket.created_at)}
              </span>
            </div>
            <button
              disabled={loading}
              onClick={(e) => { e.stopPropagation(); handleAction(() => onStartBuild(ticket.id)) }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Start Build
            </button>
          </>
        )}

        {/* IN PROGRESS */}
        {ticket.status === 'in_progress' && (
          <>
            {ticket.agent_plan && <PlanProgress plan={ticket.agent_plan} compact />}
            <DiffSummary diff={ticket.agent_diff} compact />
          </>
        )}

        {/* REVIEW */}
        {ticket.status === 'review' && (
          <>
            {ticket.review_result && <ReviewResults result={ticket.review_result} compact />}

            {/* Output indicators */}
            {(ticket.outputs.video_path || ticket.outputs.markdown_path || Object.keys(ticket.outputs.after_screenshots).length > 0) && (
              <div className="flex items-center gap-2 pt-1">
                {Object.keys(ticket.outputs.after_screenshots).length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                    <Camera size={11} /> Screenshots
                  </span>
                )}
                {ticket.outputs.video_path && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                    <Film size={11} /> Video
                  </span>
                )}
                {ticket.outputs.markdown_path && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                    <FileText size={11} /> Summary
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            {!rejectMode ? (
              <div className="flex gap-2 pt-1">
                <button
                  disabled={loading}
                  onClick={(e) => { e.stopPropagation(); handleAction(() => onApprove(ticket.id)) }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium bg-[var(--color-success)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Approve
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setRejectMode(true) }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
                >
                  <X size={12} />
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1" onClick={e => e.stopPropagation()}>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="What needs to be fixed?"
                  className="w-full text-xs p-2 border border-[var(--color-border)] rounded-md resize-none focus:outline-none focus:border-[var(--color-border-focus)] bg-[var(--color-surface)]"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    disabled={!feedback.trim() || loading}
                    onClick={() => handleAction(() => { onReject(ticket.id, feedback); setRejectMode(false); setFeedback('') })}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium bg-[var(--color-danger)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : 'Submit Rejection'}
                  </button>
                  <button
                    onClick={() => { setRejectMode(false); setFeedback('') }}
                    className="px-3 py-1.5 rounded-md text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* DONE */}
        {ticket.status === 'done' && (
          <>
            {ticket.build_duration_seconds && (
              <span className="text-xs text-[var(--color-text-muted)]">
                Completed in {formatDuration(ticket.build_duration_seconds)}
              </span>
            )}
            {ticket.review_result && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                {ticket.review_result.criteria_results.filter(c => c.status === 'pass').length}/{ticket.review_result.criteria_results.length} criteria passed
              </span>
            )}
          </>
        )}

        {/* FAILED */}
        {ticket.status === 'failed' && (
          <>
            {ticket.agent_logs.filter(l => l.type === 'error').slice(-1).map((log, i) => (
              <div key={i} className="text-xs text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-md p-2">
                {log.message}
              </div>
            ))}
            <button
              disabled={loading}
              onClick={(e) => { e.stopPropagation(); handleAction(() => onStartBuild(ticket.id)) }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Retry Build
            </button>
          </>
        )}

        {/* Expand hint */}
        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={12} className="text-[var(--color-text-muted)]" />
        </div>
      </div>
    </div>
  )
}
