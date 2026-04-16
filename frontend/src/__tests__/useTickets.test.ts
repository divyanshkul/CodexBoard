import { describe, it, expect } from 'vitest'
import { ticketReducer, type TicketAction } from '../hooks/useTickets'
import type { Ticket, PlanStep, AgentLog, ReviewResult } from '../types'

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'test-1',
    title: 'Test ticket',
    description: 'Test desc',
    acceptance_criteria: ['It works'],
    target_repo: '/tmp/test',
    output_preferences: { screenshots: false, pixel_diff: false, video: false, markdown: false },
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
    outputs: { before_screenshots: {}, after_screenshots: {}, diff_heatmaps: {}, video_path: null, markdown_path: null },
    current_phase: null,
    codex_thread_id: null,
    worktree_path: null,
    ...overrides,
  }
}

describe('ticketReducer', () => {
  it('SET_TICKETS replaces all tickets', () => {
    const tickets = [makeTicket({ id: 'a' }), makeTicket({ id: 'b' })]
    const result = ticketReducer([makeTicket({ id: 'old' })], { type: 'SET_TICKETS', tickets })
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
  })

  it('ADD_TICKET appends a new ticket', () => {
    const existing = [makeTicket({ id: 'a' })]
    const newTicket = makeTicket({ id: 'b' })
    const result = ticketReducer(existing, { type: 'ADD_TICKET', ticket: newTicket })
    expect(result).toHaveLength(2)
    expect(result[1].id).toBe('b')
  })

  it('UPDATE_TICKET replaces ticket by id', () => {
    const existing = [makeTicket({ id: 'a', status: 'todo' })]
    const updated = makeTicket({ id: 'a', status: 'in_progress' })
    const result = ticketReducer(existing, { type: 'UPDATE_TICKET', ticket: updated })
    expect(result[0].status).toBe('in_progress')
  })

  it('UPDATE_PLAN updates agent_plan for the right ticket', () => {
    const existing = [makeTicket({ id: 'a' }), makeTicket({ id: 'b' })]
    const plan: PlanStep[] = [{ step: 'Analyze', status: 'completed' }]
    const result = ticketReducer(existing, { type: 'UPDATE_PLAN', ticket_id: 'a', plan })
    expect(result[0].agent_plan).toEqual(plan)
    expect(result[1].agent_plan).toBeNull()
  })

  it('UPDATE_DIFF updates agent_diff for the right ticket', () => {
    const existing = [makeTicket({ id: 'a' })]
    const result = ticketReducer(existing, { type: 'UPDATE_DIFF', ticket_id: 'a', diff: 'diff --git ...' })
    expect(result[0].agent_diff).toBe('diff --git ...')
  })

  it('APPEND_LOG adds to agent_logs array', () => {
    const existing = [makeTicket({ id: 'a', agent_logs: [] })]
    const log: AgentLog = { timestamp: new Date().toISOString(), type: 'info', message: 'Hello' }
    const result = ticketReducer(existing, { type: 'APPEND_LOG', ticket_id: 'a', log })
    expect(result[0].agent_logs).toHaveLength(1)
    expect(result[0].agent_logs[0].message).toBe('Hello')
  })

  it('SET_REVIEW updates review_result', () => {
    const existing = [makeTicket({ id: 'a' })]
    const review: ReviewResult = {
      criteria_results: [{ criterion: 'It works', status: 'pass', explanation: 'OK' }],
      summary: 'Good',
      raw_review_text: 'Full text',
      files_changed: 3,
      risk_level: 'low',
    }
    const result = ticketReducer(existing, { type: 'SET_REVIEW', ticket_id: 'a', review_result: review })
    expect(result[0].review_result).toEqual(review)
  })

  it('SET_OUTPUT updates the correct output field for before_screenshots', () => {
    const existing = [makeTicket({ id: 'a' })]
    const result = ticketReducer(existing, {
      type: 'SET_OUTPUT',
      ticket_id: 'a',
      output_type: 'before_screenshots',
      data: { '/': 'before/root.png' },
    })
    expect(result[0].outputs.before_screenshots).toEqual({ '/': 'before/root.png' })
  })

  it('SET_OUTPUT updates video_path', () => {
    const existing = [makeTicket({ id: 'a' })]
    const result = ticketReducer(existing, {
      type: 'SET_OUTPUT',
      ticket_id: 'a',
      output_type: 'video',
      data: { path: 'video/walkthrough.webm' },
    })
    expect(result[0].outputs.video_path).toBe('video/walkthrough.webm')
  })

  it('SET_OUTPUT updates markdown_path', () => {
    const existing = [makeTicket({ id: 'a' })]
    const result = ticketReducer(existing, {
      type: 'SET_OUTPUT',
      ticket_id: 'a',
      output_type: 'markdown',
      data: { path: 'markdown/summary.md' },
    })
    expect(result[0].outputs.markdown_path).toBe('markdown/summary.md')
  })

  it('ignores actions for non-existent ticket ids', () => {
    const existing = [makeTicket({ id: 'a' })]
    const plan: PlanStep[] = [{ step: 'Step', status: 'pending' }]
    const result = ticketReducer(existing, { type: 'UPDATE_PLAN', ticket_id: 'nonexistent', plan })
    expect(result).toEqual(existing)
  })

  it('handles unknown action type gracefully', () => {
    const existing = [makeTicket({ id: 'a' })]
    const result = ticketReducer(existing, { type: 'UNKNOWN' } as unknown as TicketAction)
    expect(result).toEqual(existing)
  })
})
