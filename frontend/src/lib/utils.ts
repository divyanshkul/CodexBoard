import type { TicketStatus } from '../types'

export function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export function formatElapsed(startIso: string): string {
  const diff = Math.max(0, Date.now() - new Date(startIso).getTime())
  return formatDuration(diff / 1000)
}

export function statusColor(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    todo: 'var(--color-status-todo)',
    in_progress: 'var(--color-status-progress)',
    review: 'var(--color-status-review)',
    done: 'var(--color-status-done)',
    failed: 'var(--color-status-failed)',
  }
  return map[status]
}

export function statusLabel(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    todo: 'Todo',
    in_progress: 'In Progress',
    review: 'In Review',
    done: 'Done',
    failed: 'Failed',
  }
  return map[status]
}

export function parseDiffStats(diff: string | null): {
  files: number
  insertions: number
  deletions: number
  filenames: string[]
} {
  if (!diff) return { files: 0, insertions: 0, deletions: 0, filenames: [] }
  const fileHeaders = diff.match(/diff --git a\/(.*?) b\//g) || []
  const filenames = fileHeaders.map(h => {
    const match = h.match(/diff --git a\/(.*?) b\//)
    return match ? match[1] : ''
  }).filter(Boolean)
  const insertions = (diff.match(/^\+(?!\+\+)/gm) || []).length
  const deletions = (diff.match(/^-(?!--)/gm) || []).length
  return { files: filenames.length, insertions, deletions, filenames }
}

export function truncateRepo(path: string): string {
  const parts = path.split('/')
  return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : path
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
