import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanProgress } from '../../components/PlanProgress'

describe('PlanProgress', () => {
  it('renders plan steps with correct text', () => {
    const plan = [
      { step: 'Analyze codebase', status: 'completed' as const },
      { step: 'Write feature', status: 'inProgress' as const },
      { step: 'Add tests', status: 'pending' as const },
    ]
    render(<PlanProgress plan={plan} />)
    expect(screen.getByText('Analyze codebase')).toBeInTheDocument()
    expect(screen.getByText('Write feature')).toBeInTheDocument()
    expect(screen.getByText('Add tests')).toBeInTheDocument()
  })

  it('shows progress percentage', () => {
    const plan = [
      { step: 'Step 1', status: 'completed' as const },
      { step: 'Step 2', status: 'completed' as const },
      { step: 'Step 3', status: 'pending' as const },
    ]
    render(<PlanProgress plan={plan} />)
    expect(screen.getByText('67%')).toBeInTheDocument()
  })

  it('returns null for empty plan', () => {
    const { container } = render(<PlanProgress plan={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('handles 100% completed', () => {
    const plan = [
      { step: 'Done step', status: 'completed' as const },
    ]
    render(<PlanProgress plan={plan} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
