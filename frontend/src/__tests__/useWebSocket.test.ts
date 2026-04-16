import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { TicketAction } from '../hooks/useTickets'

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  readyState = 0

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.()
    }, 0)
  }

  close() {
    this.readyState = 3
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('WebSocket event mapping', () => {
  it('dispatches UPDATE_TICKET on ticket_status_changed', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    // Wait for connection
    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({
        type: 'ticket_status_changed',
        ticket_id: 'uuid-1',
        data: { status: 'in_progress', ticket: { id: 'uuid-1', status: 'in_progress' } },
      })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_TICKET',
      ticket: { id: 'uuid-1', status: 'in_progress' },
    })
  })

  it('dispatches UPDATE_PLAN on agent_plan_updated', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({
        type: 'agent_plan_updated',
        ticket_id: 'uuid-1',
        data: { plan: [{ step: 'Analyze', status: 'completed' }] },
      })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_PLAN',
      ticket_id: 'uuid-1',
      plan: [{ step: 'Analyze', status: 'completed' }],
      explanation: undefined,
    })
  })

  it('dispatches UPDATE_DIFF on agent_diff_updated', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({
        type: 'agent_diff_updated',
        ticket_id: 'uuid-1',
        data: { diff: 'diff --git ...' },
      })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_DIFF',
      ticket_id: 'uuid-1',
      diff: 'diff --git ...',
    })
  })

  it('dispatches APPEND_LOG on agent_log', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    const log = { timestamp: '2025-04-16T10:00:00Z', type: 'info', message: 'Hello' }
    act(() => {
      ws.simulateMessage({
        type: 'agent_log',
        ticket_id: 'uuid-1',
        data: { log },
      })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'APPEND_LOG',
      ticket_id: 'uuid-1',
      log,
    })
  })

  it('dispatches SET_REVIEW and UPDATE_TICKET on review_complete', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    const review = { criteria_results: [], summary: 'Good', raw_review_text: '', files_changed: 2, risk_level: 'low' }
    act(() => {
      ws.simulateMessage({
        type: 'review_complete',
        ticket_id: 'uuid-1',
        data: { review_result: review, ticket: { id: 'uuid-1', status: 'review' } },
      })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_REVIEW',
      ticket_id: 'uuid-1',
      review_result: review,
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_TICKET',
      ticket: { id: 'uuid-1', status: 'review' },
    })
  })

  it('dispatches SET_OUTPUT on output_ready', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({
        type: 'output_ready',
        ticket_id: 'uuid-1',
        data: { output_type: 'before_screenshots', outputs: { '/': 'before/root.png' } },
      })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_OUTPUT',
      ticket_id: 'uuid-1',
      output_type: 'before_screenshots',
      data: { '/': 'before/root.png' },
    })
  })

  it('dispatches UPDATE_TICKET on build_failed', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({
        type: 'build_failed',
        ticket_id: 'uuid-1',
        data: { error: 'Context exceeded', ticket: { id: 'uuid-1', status: 'failed' } },
      })
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_TICKET',
      ticket: { id: 'uuid-1', status: 'failed' },
    })
  })

  it('ignores unknown event types', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({
        type: 'some_unknown_event',
        ticket_id: 'uuid-1',
        data: {},
      })
    })

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('ignores malformed JSON', async () => {
    const dispatch = vi.fn()
    renderHook(() => useWebSocket('ws://test/ws', dispatch))

    await vi.waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.onmessage?.({ data: 'not json{{{' })
    })

    expect(dispatch).not.toHaveBeenCalled()
  })
})
