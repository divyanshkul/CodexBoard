import { useState } from 'react'
import {
  X, Check, RotateCcw, Clock, CheckCircle2, AlertTriangle, Loader2,
  FileCode2, MessageSquare, Camera, Film, FileText
} from 'lucide-react'
import type { Ticket } from '../types'
import { formatDuration, relativeTime, statusLabel, statusColor } from '../lib/utils'
import { PlanProgress } from './PlanProgress'
import { DiffSummary } from './DiffSummary'
import { ReviewResults } from './ReviewResults'
import { AgentLogFeed } from './AgentLogFeed'
import { ScreenshotViewer } from './ScreenshotViewer'
import { VideoPlayer } from './VideoPlayer'
import { MarkdownViewer } from './MarkdownViewer'

interface TicketDetailModalProps {
  ticket: Ticket | null
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string, feedback: string) => void
  onStartBuild: (id: string) => void
}

type Tab = 'overview' | 'logs' | 'diff' | 'outputs'

export function TicketDetailModal({ ticket, onClose, onApprove, onReject, onStartBuild }: TicketDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [rejectMode, setRejectMode] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  if (!ticket) return null

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare; show: boolean }[] = [
    { key: 'overview', label: 'Overview', icon: CheckCircle2, show: true },
    { key: 'logs', label: 'Activity', icon: MessageSquare, show: ticket.agent_logs.length > 0 },
    { key: 'diff', label: 'Changes', icon: FileCode2, show: !!ticket.agent_diff },
    { key: 'outputs', label: 'Outputs', icon: Camera, show: !!(ticket.outputs.video_path || ticket.outputs.markdown_path || Object.keys(ticket.outputs.before_screenshots).length > 0 || Object.keys(ticket.outputs.after_screenshots).length > 0) },
  ]

  const handleAction = async (action: () => Promise<void> | void) => {
    setLoading(true)
    try { await action() } finally { setLoading(false) }
  }

  const hasOutputs = Object.keys(ticket.outputs.before_screenshots).length > 0 ||
    Object.keys(ticket.outputs.after_screenshots).length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--color-overlay)]" />

      <div
        className="relative bg-[var(--color-surface)] rounded-xl shadow-2xl w-full max-w-[720px] max-h-[85vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3 border-b border-[var(--color-border-light)]">
          <div className="space-y-1 flex-1 mr-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">{ticket.id.slice(0, 8)}</span>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: statusColor(ticket.status) + '18', color: statusColor(ticket.status) }}
              >
                {statusLabel(ticket.status)}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{ticket.title}</h2>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{ticket.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)] shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 border-b border-[var(--color-border-light)]">
          {tabs.filter(t => t.show).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <>
              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                <span>Created {relativeTime(ticket.created_at)}</span>
                {ticket.build_duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    Built in {formatDuration(ticket.build_duration_seconds)}
                  </span>
                )}
                {ticket.target_repo && (
                  <span className="font-mono">{ticket.target_repo}</span>
                )}
              </div>

              {/* Acceptance Criteria */}
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Acceptance Criteria</h3>
                {ticket.review_result ? (
                  <ReviewResults result={ticket.review_result} />
                ) : (
                  <ul className="space-y-1">
                    {ticket.acceptance_criteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--color-text-secondary)]">
                        <span className="text-[var(--color-text-muted)] shrink-0">{i + 1}.</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Plan */}
              {ticket.agent_plan && (
                <div className="space-y-2">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Build Plan</h3>
                  <PlanProgress plan={ticket.agent_plan} />
                </div>
              )}

              {/* Review summary */}
              {ticket.review_result && (
                <div className="space-y-2">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Review Summary</h3>
                  <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                    {ticket.review_result.summary}
                  </p>
                </div>
              )}

              {/* Rejection feedback */}
              {ticket.rejection_feedback && (
                <div className="space-y-1">
                  <h3 className="text-[13px] font-semibold text-[var(--color-danger)]">Previous Rejection Feedback</h3>
                  <p className="text-[13px] text-[var(--color-text-secondary)] bg-[var(--color-danger-light)] p-3 rounded-lg">
                    {ticket.rejection_feedback}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Logs tab */}
          {activeTab === 'logs' && (
            <AgentLogFeed logs={ticket.agent_logs} maxHeight={500} />
          )}

          {/* Diff tab */}
          {activeTab === 'diff' && (
            <div className="space-y-3">
              <DiffSummary diff={ticket.agent_diff} />
              {ticket.agent_diff && (
                <pre className="text-[11px] font-mono leading-relaxed bg-[var(--color-surface-active)] border border-[var(--color-border-light)] rounded-lg p-4 overflow-x-auto whitespace-pre max-h-[500px] overflow-y-auto">
                  {ticket.agent_diff}
                </pre>
              )}
            </div>
          )}

          {/* Outputs tab */}
          {activeTab === 'outputs' && (
            <div className="space-y-6">
              {hasOutputs && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
                    <Camera size={14} /> Screenshots
                  </h3>
                  <ScreenshotViewer
                    before={ticket.outputs.before_screenshots}
                    after={ticket.outputs.after_screenshots}
                    diffs={ticket.outputs.diff_heatmaps}
                    ticketId={ticket.id}
                  />
                </div>
              )}
              {ticket.outputs.video_path && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
                    <Film size={14} /> Video Walkthrough
                  </h3>
                  <VideoPlayer src={ticket.outputs.video_path} ticketId={ticket.id} />
                </div>
              )}
              {ticket.outputs.markdown_path && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
                    <FileText size={14} /> Summary
                  </h3>
                  <MarkdownViewer src={ticket.outputs.markdown_path} ticketId={ticket.id} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(ticket.status === 'review' || ticket.status === 'todo' || ticket.status === 'failed') && (
          <div className="border-t border-[var(--color-border-light)] px-6 py-4">
            {ticket.status === 'review' && !rejectMode && (
              <div className="flex gap-3">
                <button
                  disabled={loading}
                  onClick={() => handleAction(() => onApprove(ticket.id))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-[var(--color-success)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Approve
                </button>
                <button
                  onClick={() => setRejectMode(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
                >
                  <X size={14} /> Reject
                </button>
              </div>
            )}
            {ticket.status === 'review' && rejectMode && (
              <div className="space-y-3">
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="What needs to be fixed?"
                  className="w-full text-sm p-3 border border-[var(--color-border)] rounded-lg resize-none focus:outline-none focus:border-[var(--color-border-focus)] bg-[var(--color-surface)]"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    disabled={!feedback.trim() || loading}
                    onClick={() => handleAction(async () => { onReject(ticket.id, feedback); setRejectMode(false); setFeedback('') })}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-[var(--color-danger)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Submit Rejection'}
                  </button>
                  <button
                    onClick={() => { setRejectMode(false); setFeedback('') }}
                    className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {(ticket.status === 'todo' || ticket.status === 'failed') && (
              <button
                disabled={loading}
                onClick={() => handleAction(() => onStartBuild(ticket.id))}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : ticket.status === 'failed' ? <RotateCcw size={14} /> : <AlertTriangle size={14} />}
                {ticket.status === 'failed' ? 'Retry Build' : 'Start Build'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
