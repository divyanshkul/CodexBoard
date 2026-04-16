import { describe, it, expect } from 'vitest'
import type { Ticket, TicketStatus, PlanStepStatus, OutputPreferences, TicketOutputs } from '../types'

describe('Ticket type contract', () => {
  it('should have all required fields', () => {
    const ticket: Ticket = {
      id: 'uuid-123',
      title: 'Test',
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
    }
    expect(ticket.status).toBe('todo')
    expect(ticket.id).toBe('uuid-123')
    expect(ticket.acceptance_criteria).toHaveLength(1)
    expect(ticket.agent_logs).toEqual([])
  })

  it('should accept all valid statuses', () => {
    const statuses: TicketStatus[] = ['todo', 'in_progress', 'review', 'done', 'failed']
    expect(statuses).toHaveLength(5)
    statuses.forEach(s => expect(s).toBeTruthy())
  })

  it('should accept all valid plan step statuses', () => {
    const statuses: PlanStepStatus[] = ['pending', 'inProgress', 'completed']
    expect(statuses).toHaveLength(3)
    statuses.forEach(s => expect(s).toBeTruthy())
  })

  it('should have correct OutputPreferences shape', () => {
    const prefs: OutputPreferences = { screenshots: true, pixel_diff: false, video: true, markdown: false }
    expect(prefs.screenshots).toBe(true)
    expect(prefs.pixel_diff).toBe(false)
  })

  it('should have correct TicketOutputs shape with empty defaults', () => {
    const outputs: TicketOutputs = {
      before_screenshots: {},
      after_screenshots: {},
      diff_heatmaps: {},
      video_path: null,
      markdown_path: null,
    }
    expect(outputs.before_screenshots).toEqual({})
    expect(outputs.video_path).toBeNull()
  })
})
