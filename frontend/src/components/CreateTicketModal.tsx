import { useState } from 'react'
import { X, Plus, Trash2, Camera, Grid3x3, Film, FileText, Loader2 } from 'lucide-react'
import type { CreateTicketRequest, OutputPreferences } from '../types'

interface CreateTicketModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (req: CreateTicketRequest) => Promise<void>
}

export function CreateTicketModal({ open, onClose, onSubmit }: CreateTicketModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [criteria, setCriteria] = useState<string[]>([''])
  const [targetRepo, setTargetRepo] = useState('')
  const [outputPrefs, setOutputPrefs] = useState<OutputPreferences>({
    screenshots: false,
    pixel_diff: false,
    video: false,
    markdown: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const isValid = title.trim() && description.trim() && targetRepo.trim() &&
    criteria.some(c => c.trim())

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        acceptance_criteria: criteria.filter(c => c.trim()),
        target_repo: targetRepo.trim(),
        output_preferences: outputPrefs,
      })
      // Reset
      setTitle('')
      setDescription('')
      setCriteria([''])
      setTargetRepo('')
      setOutputPrefs({ screenshots: false, pixel_diff: false, video: false, markdown: false })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const addCriterion = () => setCriteria([...criteria, ''])
  const removeCriterion = (i: number) => setCriteria(criteria.filter((_, idx) => idx !== i))
  const updateCriterion = (i: number, val: string) => {
    const copy = [...criteria]
    copy[i] = val
    setCriteria(copy)
  }

  const outputOptions = [
    { key: 'screenshots' as const, icon: Camera, label: 'Before/After screenshots' },
    { key: 'pixel_diff' as const, icon: Grid3x3, label: 'Pixel diff heatmap' },
    { key: 'video' as const, icon: Film, label: 'Video walkthrough' },
    { key: 'markdown' as const, icon: FileText, label: 'Markdown summary' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-[var(--color-overlay)]" />

      {/* Modal */}
      <div
        className="relative bg-[var(--color-surface)] rounded-xl shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Create Ticket
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--color-text-primary)]">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be built?"
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-border-focus)] bg-[var(--color-surface)] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--color-text-primary)]">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the feature in detail. Mention relevant routes (e.g. /settings) for screenshots."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-border-focus)] bg-[var(--color-surface)] resize-none transition-colors"
            />
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Acceptance Criteria
            </label>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--color-text-muted)] w-4 text-right shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={c}
                    onChange={e => updateCriterion(i, e.target.value)}
                    placeholder="Describe a requirement..."
                    className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-border-focus)] bg-[var(--color-surface)] transition-colors"
                  />
                  {criteria.length > 1 && (
                    <button
                      onClick={() => removeCriterion(i)}
                      className="p-1 rounded-md hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addCriterion}
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors mt-1"
            >
              <Plus size={13} /> Add criterion
            </button>
          </div>

          {/* Target Repo */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--color-text-primary)]">Target Repository</label>
            <input
              type="text"
              value={targetRepo}
              onChange={e => setTargetRepo(e.target.value)}
              placeholder="/path/to/your/project"
              className="w-full px-3 py-2 text-sm font-mono border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-border-focus)] bg-[var(--color-surface)] transition-colors"
            />
          </div>

          {/* Output Preferences */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[var(--color-text-primary)]">Output Preferences</label>
            <div className="grid grid-cols-2 gap-2">
              {outputOptions.map(opt => (
                <label
                  key={opt.key}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors text-xs ${
                    outputPrefs[opt.key]
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={outputPrefs[opt.key]}
                    onChange={e => setOutputPrefs({ ...outputPrefs, [opt.key]: e.target.checked })}
                    className="sr-only"
                  />
                  <opt.icon size={14} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-[var(--color-danger)] bg-[var(--color-danger-light)] p-2 rounded-md">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!isValid || submitting}
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Create Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
