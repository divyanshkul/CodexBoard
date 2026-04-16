import { useEffect, useRef, useState, useCallback, type Dispatch } from 'react'
import type { TicketAction } from './useTickets'
import type { WSMessage, PlanStep, AgentLog, ReviewResult, Ticket } from '../types'

export function useWebSocket(
  url: string,
  dispatch: Dispatch<TicketAction>,
): { connected: boolean; reconnect: () => void } {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let msg: WSMessage
      try {
        msg = JSON.parse(event.data) as WSMessage
      } catch {
        return
      }

      const { type, ticket_id, data } = msg

      switch (type) {
        case 'ticket_status_changed':
          if (data.ticket) {
            dispatch({ type: 'UPDATE_TICKET', ticket: data.ticket as Ticket })
          }
          break

        case 'agent_plan_updated':
          if (data.plan) {
            dispatch({
              type: 'UPDATE_PLAN',
              ticket_id,
              plan: data.plan as PlanStep[],
              explanation: data.explanation as string | undefined,
            })
          }
          break

        case 'agent_diff_updated':
          if (data.diff !== undefined) {
            dispatch({
              type: 'UPDATE_DIFF',
              ticket_id,
              diff: data.diff as string,
            })
          }
          break

        case 'agent_log':
          if (data.log) {
            dispatch({
              type: 'APPEND_LOG',
              ticket_id,
              log: data.log as AgentLog,
            })
          }
          break

        case 'review_started':
          // No specific state update needed, card already shows reviewing
          break

        case 'review_complete':
          if (data.review_result) {
            dispatch({
              type: 'SET_REVIEW',
              ticket_id,
              review_result: data.review_result as ReviewResult,
            })
          }
          if (data.ticket) {
            dispatch({ type: 'UPDATE_TICKET', ticket: data.ticket as Ticket })
          }
          break

        case 'output_ready':
          if (data.output_type && data.outputs) {
            dispatch({
              type: 'SET_OUTPUT',
              ticket_id,
              output_type: data.output_type as string,
              data: data.outputs as Record<string, unknown>,
            })
          }
          break

        case 'build_failed':
          if (data.ticket) {
            dispatch({ type: 'UPDATE_TICKET', ticket: data.ticket as Ticket })
          }
          break

        default:
          // Unknown event type, ignore
          break
      }
    },
    [dispatch],
  )

  const connect = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        retryRef.current = 0
      }

      ws.onmessage = handleMessage

      ws.onclose = () => {
        setConnected(false)
        const delay = Math.min(1000 * 2 ** retryRef.current, 10000)
        retryRef.current++
        timerRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      setConnected(false)
    }
  }, [url, handleMessage])

  useEffect(() => {
    connect()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  const reconnect = useCallback(() => {
    retryRef.current = 0
    connect()
  }, [connect])

  return { connected, reconnect }
}
