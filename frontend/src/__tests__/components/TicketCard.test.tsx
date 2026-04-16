import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TicketCard } from '../../components/TicketCard'
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

describe('TicketCard', () => {
  const noop = vi.fn()

  it('renders Start Build button for todo tickets', () => {
    render(<TicketCard ticket={makeTicket({ status: 'todo' })} onStartBuild={noop} onApprove={noop} onReject={noop} onClick={noop} />)
    expect(screen.getByText('Start Build')).toBeInTheDocument()
  })

  it('renders plan progress for in_progress tickets', () => {
    const ticket = makeTicket({
      status: 'in_progress',
      build_started_at: new Date().toISOString(),
      agent_plan: [
        { step: 'Analyze code', status: 'completed' },
        { step: 'Write feature', status: 'inProgress' },
      ],
    })
    render(<TicketCard ticket={ticket} onStartBuild={noop} onApprove={noop} onReject={noop} onClick={noop} />)
    expect(screen.getByText('Analyze code')).toBeInTheDocument()
    expect(screen.getByText('Write feature')).toBeInTheDocument()
  })

  it('renders criteria results for review tickets', () => {
    const ticket = makeTicket({
      status: 'review',
      review_result: {
        criteria_results: [
          { criterion: 'User can reset password', status: 'pass', explanation: 'OK' },
        ],
        summary: 'Good',
        raw_review_text: '',
        files_changed: 2,
        risk_level: 'low',
      },
    })
    render(<TicketCard ticket={ticket} onStartBuild={noop} onApprove={noop} onReject={noop} onClick={noop} />)
    expect(screen.getByText('User can reset password')).toBeInTheDocument()
  })

  it('renders approve/reject buttons for review tickets', () => {
    const ticket = makeTicket({
      status: 'review',
      review_result: {
        criteria_results: [],
        summary: 'Good',
        raw_review_text: '',
        files_changed: 2,
        risk_level: 'low',
      },
    })
    render(<TicketCard ticket={ticket} onStartBuild={noop} onApprove={noop} onReject={noop} onClick={noop} />)
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('renders completed badge for done tickets', () => {
    const ticket = makeTicket({ status: 'done', build_duration_seconds: 500 })
    render(<TicketCard ticket={ticket} onStartBuild={noop} onApprove={noop} onReject={noop} onClick={noop} />)
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders error + retry for failed tickets', () => {
    const ticket = makeTicket({
      status: 'failed',
      agent_logs: [
        { timestamp: new Date().toISOString(), type: 'error', message: 'Context window exceeded' },
      ],
    })
    render(<TicketCard ticket={ticket} onStartBuild={noop} onApprove={noop} onReject={noop} onClick={noop} />)
    expect(screen.getByText('Context window exceeded')).toBeInTheDocument()
    expect(screen.getByText('Retry Build')).toBeInTheDocument()
  })

  it('renders ticket title for all statuses', () => {
    render(<TicketCard ticket={makeTicket({ title: 'My feature' })} onStartBuild={noop} onApprove={noop} onReject={noop} onClick={noop} />)
    expect(screen.getByText('My feature')).toBeInTheDocument()
  })
})
