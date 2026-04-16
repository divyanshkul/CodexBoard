import { FileCode2, Plus, Minus } from 'lucide-react'
import { parseDiffStats } from '../lib/utils'

interface DiffSummaryProps {
  diff: string | null
  compact?: boolean
}

export function DiffSummary({ diff, compact = false }: DiffSummaryProps) {
  const stats = parseDiffStats(diff)

  if (stats.files === 0) return null

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <FileCode2 size={12} />
        <span>{stats.files} file{stats.files !== 1 ? 's' : ''}</span>
        <span className="text-emerald-600">+{stats.insertions}</span>
        <span className="text-red-500">-{stats.deletions}</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[13px]">
        <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
          <FileCode2 size={14} />
          <span className="font-medium">{stats.files} file{stats.files !== 1 ? 's' : ''} changed</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600">
          <Plus size={12} />
          <span className="font-mono text-xs">{stats.insertions}</span>
        </div>
        <div className="flex items-center gap-1 text-red-500">
          <Minus size={12} />
          <span className="font-mono text-xs">{stats.deletions}</span>
        </div>
      </div>

      {stats.filenames.length > 0 && (
        <div className="space-y-0.5">
          {stats.filenames.map((name, i) => (
            <div
              key={i}
              className="text-xs font-mono text-[var(--color-text-muted)] truncate pl-5"
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
