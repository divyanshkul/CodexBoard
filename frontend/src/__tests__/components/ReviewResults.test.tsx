import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewResults } from '../../components/ReviewResults'
import type { ReviewResult } from '../../types'

describe('ReviewResults', () => {
  const result: ReviewResult = {
    criteria_results: [
      { criterion: 'User can reset password', status: 'pass', explanation: 'Works correctly' },
      { criterion: 'Email sent on reset', status: 'fail', explanation: 'No email integration found' },
      { criterion: 'Token validation', status: 'unknown', explanation: 'Not verified' },
    ],
    summary: 'Partial implementation',
    raw_review_text: 'Full text',
    files_changed: 4,
    risk_level: 'medium',
  }

  it('renders all criteria', () => {
    render(<ReviewResults result={result} />)
    expect(screen.getByText('User can reset password')).toBeInTheDocument()
    expect(screen.getByText('Email sent on reset')).toBeInTheDocument()
    expect(screen.getByText('Token validation')).toBeInTheDocument()
  })

  it('shows pass/fail counts', () => {
    render(<ReviewResults result={result} />)
    expect(screen.getByText('1 passed')).toBeInTheDocument()
    expect(screen.getByText('1 failed')).toBeInTheDocument()
  })

  it('shows risk level badge', () => {
    render(<ReviewResults result={result} />)
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('renders compact mode without counts', () => {
    render(<ReviewResults result={result} compact />)
    expect(screen.getByText('User can reset password')).toBeInTheDocument()
    // compact mode hides the summary bar
    expect(screen.queryByText('1 passed')).not.toBeInTheDocument()
  })
})
