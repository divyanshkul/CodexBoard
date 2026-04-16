import type { Ticket, TicketStatus } from '../types'
import { TicketCard } from './TicketCard'
import { statusLabel, statusColor } from '../lib/utils'

interface ColumnProps {
  status: TicketStatus
  tickets: Ticket[]
  onStartBuild: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string, feedback: string) => void
  onCardClick: (ticket: Ticket) => void
}

export function Column({ status, tickets, onStartBuild, onApprove, onReject, onCardClick }: ColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: statusColor(status) }}
        />
        <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
          {statusLabel(status)}
        </span>
        <span className="text-[11px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {tickets.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-4">
        {tickets.length === 0 && (
          <div className="text-center py-8 text-[11px] text-[var(--color-text-muted)]">
            No tickets
          </div>
        )}
        {tickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onStartBuild={onStartBuild}
            onApprove={onApprove}
            onReject={onReject}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}
