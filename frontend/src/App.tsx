import { useState, useCallback } from 'react'
import { Plus, Wifi, WifiOff, Zap } from 'lucide-react'
import { useTickets } from './hooks/useTickets'
import { useWebSocket } from './hooks/useWebSocket'
import { Board } from './components/Board'
import { CreateTicketModal } from './components/CreateTicketModal'
import { TicketDetailModal } from './components/TicketDetailModal'
import { mockTickets } from './mock/mockData'
import { startMockBuild } from './mock/mockWebSocket'
import type { Ticket, CreateTicketRequest } from './types'
import * as api from './api'

function App() {
  const { tickets, dispatch } = useTickets(mockTickets)
  const { connected } = useWebSocket('ws://localhost:8000/ws', dispatch)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null)

  // Keep detail modal ticket in sync with state
  const currentDetailTicket = detailTicket
    ? tickets.find(t => t.id === detailTicket.id) || detailTicket
    : null

  const handleCreateTicket = useCallback(async (req: CreateTicketRequest) => {
    try {
      const ticket = await api.createTicket(req)
      dispatch({ type: 'ADD_TICKET', ticket })
    } catch {
      // Backend not available, create locally with mock
      const mockTicket: Ticket = {
        id: `cb-${Date.now().toString(36)}`,
        ...req,
        status: 'todo',
        created_at: new Date().toISOString(),
        build_started_at: null,
        build_completed_at: null,
        build_duration_seconds: null,
        rejection_feedback: null,
        agent_plan: null,
        agent_diff: null,
        agent_logs: [],
        review_result: null,
        outputs: {
          before_screenshots: {},
          after_screenshots: {},
          diff_heatmaps: {},
          video_path: null,
          markdown_path: null,
        },
        current_phase: null,
        codex_thread_id: null,
        worktree_path: null,
      }
      dispatch({ type: 'ADD_TICKET', ticket: mockTicket })
    }
  }, [dispatch])

  const handleStartBuild = useCallback(async (id: string) => {
    try {
      const ticket = await api.startBuild(id)
      dispatch({ type: 'UPDATE_TICKET', ticket })
    } catch {
      // Mock mode: simulate build locally
      const ticket = tickets.find(t => t.id === id)
      if (ticket) startMockBuild(ticket, dispatch)
    }
  }, [tickets, dispatch])

  const handleApprove = useCallback(async (id: string) => {
    try {
      const ticket = await api.approveTicket(id)
      dispatch({ type: 'UPDATE_TICKET', ticket })
    } catch {
      // Mock mode
      const ticket = tickets.find(t => t.id === id)
      if (ticket) {
        dispatch({
          type: 'UPDATE_TICKET',
          ticket: { ...ticket, status: 'done', build_completed_at: new Date().toISOString() },
        })
      }
    }
  }, [tickets, dispatch])

  const handleReject = useCallback(async (id: string, feedback: string) => {
    try {
      const ticket = await api.rejectTicket(id, feedback)
      dispatch({ type: 'UPDATE_TICKET', ticket })
    } catch {
      // Mock mode
      const ticket = tickets.find(t => t.id === id)
      if (ticket) {
        const rejected: Ticket = {
          ...ticket,
          status: 'in_progress',
          rejection_feedback: feedback,
          agent_plan: null,
          agent_diff: null,
          agent_logs: [],
          review_result: null,
          build_started_at: new Date().toISOString(),
        }
        dispatch({ type: 'UPDATE_TICKET', ticket: rejected })
        startMockBuild(rejected, dispatch)
      }
    }
  }, [tickets, dispatch])

  return (
    <div className="h-screen flex flex-col bg-[var(--color-page)]">
      {/* Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[var(--color-border)]  bg-[var(--color-surface)]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-accent)] text-white">
            <Zap size={15} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            CodexBoard
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {connected ? (
              <>
                <Wifi size={12} className="text-[var(--color-success)]" />
                <span className="text-[var(--color-text-muted)]">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-muted)]">Offline</span>
              </>
            )}
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <Plus size={14} />
            Create Ticket
          </button>
        </div>
      </header>

      {/* Board */}
      <Board
        tickets={tickets}
        onStartBuild={handleStartBuild}
        onApprove={handleApprove}
        onReject={handleReject}
        onCardClick={setDetailTicket}
      />

      {/* Modals */}
      <CreateTicketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
      />
      <TicketDetailModal
        ticket={currentDetailTicket}
        onClose={() => setDetailTicket(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onStartBuild={handleStartBuild}
      />
    </div>
  )
}

export default App
