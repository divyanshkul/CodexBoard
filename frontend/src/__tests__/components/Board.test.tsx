import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Board } from '../../components/Board'
import type { Ticket } from '../../types'

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'test-1',
    title: 'Test ticket',
    description: 'Desc',
    acceptance_criteria: ['Works'],
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

describe('Board', () => {
  const noop = vi.fn()

  it('renders 4 columns', () => {
    render(
      <Board tickets={[]} onStartBuild={noop} onApprove={noop} onReject={noop} onCardClick={noop} />,
    )
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('In Review')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('distributes tickets to correct columns', () => {
    const tickets = [
      makeTicket({ id: 'a', title: 'Todo ticket', status: 'todo' }),
      makeTicket({ id: 'b', title: 'Progress ticket', status: 'in_progress', build_started_at: new Date().toISOString() }),
      makeTicket({ id: 'c', title: 'Review ticket', status: 'review' }),
      makeTicket({ id: 'd', title: 'Done ticket', status: 'done' }),
    ]
    render(
      <Board tickets={tickets} onStartBuild={noop} onApprove={noop} onReject={noop} onCardClick={noop} />,
    )
    expect(screen.getByText('Todo ticket')).toBeInTheDocument()
    expect(screen.getByText('Progress ticket')).toBeInTheDocument()
    expect(screen.getByText('Review ticket')).toBeInTheDocument()
    expect(screen.getByText('Done ticket')).toBeInTheDocument()
  })

  it('shows empty state when no tickets', () => {
    render(
      <Board tickets={[]} onStartBuild={noop} onApprove={noop} onReject={noop} onCardClick={noop} />,
    )
    const emptyStates = screen.getAllByText('No tickets')
    expect(emptyStates.length).toBe(4)
  })
})
