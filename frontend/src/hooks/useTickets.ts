import { useReducer, useCallback, useEffect } from 'react'
import type { Ticket, TicketStatus, PlanStep, AgentLog, ReviewResult } from '../types'
import { listTickets } from '../api'

export type TicketAction =
  | { type: 'SET_TICKETS'; tickets: Ticket[] }
  | { type: 'ADD_TICKET'; ticket: Ticket }
  | { type: 'UPDATE_TICKET'; ticket: Ticket }
  | { type: 'UPDATE_PLAN'; ticket_id: string; plan: PlanStep[]; explanation?: string }
  | { type: 'UPDATE_DIFF'; ticket_id: string; diff: string }
  | { type: 'APPEND_LOG'; ticket_id: string; log: AgentLog }
  | { type: 'SET_REVIEW'; ticket_id: string; review_result: ReviewResult }
  | { type: 'SET_OUTPUT'; ticket_id: string; output_type: string; data: Record<string, unknown> }

function updateTicketById(state: Ticket[], id: string, updater: (t: Ticket) => Ticket): Ticket[] {
  const idx = state.findIndex(t => t.id === id)
  if (idx === -1) return state
  const copy = [...state]
  copy[idx] = updater(copy[idx])
  return copy
}

export function ticketReducer(state: Ticket[], action: TicketAction): Ticket[] {
  switch (action.type) {
    case 'SET_TICKETS':
      return action.tickets

    case 'ADD_TICKET':
      return [...state, action.ticket]

    case 'UPDATE_TICKET':
      return state.map(t => t.id === action.ticket.id ? action.ticket : t)

    case 'UPDATE_PLAN':
      return updateTicketById(state, action.ticket_id, t => ({
        ...t,
        agent_plan: action.plan,
      }))

    case 'UPDATE_DIFF':
      return updateTicketById(state, action.ticket_id, t => ({
        ...t,
        agent_diff: action.diff,
      }))

    case 'APPEND_LOG':
      return updateTicketById(state, action.ticket_id, t => ({
        ...t,
        agent_logs: [...t.agent_logs, action.log],
      }))

    case 'SET_REVIEW':
      return updateTicketById(state, action.ticket_id, t => ({
        ...t,
        review_result: action.review_result,
      }))

    case 'SET_OUTPUT': {
      return updateTicketById(state, action.ticket_id, t => {
        const outputs = { ...t.outputs }
        switch (action.output_type) {
          case 'before_screenshots':
            outputs.before_screenshots = {
              ...outputs.before_screenshots,
              ...(action.data as Record<string, string>),
            }
            break
          case 'after_screenshots':
            outputs.after_screenshots = {
              ...outputs.after_screenshots,
              ...(action.data as Record<string, string>),
            }
            break
          case 'diff_heatmaps':
            outputs.diff_heatmaps = {
              ...outputs.diff_heatmaps,
              ...(action.data as Record<string, string>),
            }
            break
          case 'video':
            outputs.video_path = (action.data as { path?: string }).path ?? null
            break
          case 'markdown':
            outputs.markdown_path = (action.data as { path?: string }).path ?? null
            break
        }
        return { ...t, outputs }
      })
    }

    default:
      return state
  }
}

export function useTickets(initialTickets: Ticket[] = []) {
  const [tickets, dispatch] = useReducer(ticketReducer, initialTickets)

  const getTicketsByStatus = useCallback(
    (status: TicketStatus) => tickets.filter(t => t.status === status),
    [tickets],
  )

  const loadTickets = useCallback(async () => {
    try {
      const data = await listTickets()
      dispatch({ type: 'SET_TICKETS', tickets: data })
    } catch {
      // API not available, keep current state (mock data)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  return { tickets, dispatch, getTicketsByStatus, loadTickets }
}
