import { useEffect, useRef } from 'react'
import { MessageSquare, Terminal, FileCode2, Info, AlertTriangle } from 'lucide-react'
import type { AgentLog } from '../types'
import { relativeTime } from '../lib/utils'

interface AgentLogFeedProps {
  logs: AgentLog[]
  maxHeight?: number
}

const typeIcons: Record<AgentLog['type'], typeof Info> = {
  agent_message: MessageSquare,
  command: Terminal,
  file_change: FileCode2,
  info: Info,
  error: AlertTriangle,
}

const typeStyles: Record<AgentLog['type'], string> = {
  agent_message: 'text-[var(--color-accent)]',
  command: 'text-amber-500',
  file_change: 'text-emerald-500',
  info: 'text-[var(--color-text-muted)]',
  error: 'text-[var(--color-danger)]',
}

export function AgentLogFeed({ logs, maxHeight = 300 }: AgentLogFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  if (logs.length === 0) {
    return (
      <div className="text-xs text-[var(--color-text-muted)] italic py-3 text-center">
        No activity yet
      </div>
    )
  }

  return (
    <div
      className="overflow-y-auto space-y-1"
      style={{ maxHeight }}
    >
      {logs.map((log, i) => {
        const Icon = typeIcons[log.type] || Info
        return (
          <div
            key={i}
            className="flex items-start gap-2 py-1 px-1 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors animate-slide-in"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <Icon size={12} className={`mt-0.5 shrink-0 ${typeStyles[log.type]}`} />
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs leading-relaxed ${
                  log.type === 'command' ? 'font-mono' : ''
                } ${log.type === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}
              >
                {log.message}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0 tabular-nums">
              {relativeTime(log.timestamp)}
            </span>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
