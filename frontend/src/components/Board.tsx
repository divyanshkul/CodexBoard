import type { Ticket, TicketStatus } from '../types'
import { Column } from './Column'

interface BoardProps {
  tickets: Ticket[]
  onStartBuild: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string, feedback: string) => void
  onCardClick: (ticket: Ticket) => void
}

const columns: TicketStatus[] = ['todo', 'in_progress', 'review', 'done']

export function Board({ tickets, onStartBuild, onApprove, onReject, onCardClick }: BoardProps) {
  const byStatus = (status: TicketStatus) =>
    tickets.filter(t => t.status === status || (status === 'todo' && t.status === 'failed'))

  return (
    <div className="flex gap-4 flex-1 overflow-x-auto px-6 pb-6">
      {columns.map(status => (
        <Column
          key={status}
          status={status}
          tickets={status === 'todo' ? byStatus('todo') : tickets.filter(t => t.status === status)}
          onStartBuild={onStartBuild}
          onApprove={onApprove}
          onReject={onReject}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}
