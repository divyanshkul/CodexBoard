import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffSummary } from '../../components/DiffSummary'

describe('DiffSummary', () => {
  it('counts files from diff --git headers', () => {
    const diff = `diff --git a/src/A.tsx b/src/A.tsx
+some line
diff --git a/src/B.tsx b/src/B.tsx
+another line`
    render(<DiffSummary diff={diff} />)
    expect(screen.getByText('2 files changed')).toBeInTheDocument()
  })

  it('counts insertions and deletions', () => {
    const diff = `diff --git a/src/A.tsx b/src/A.tsx
+added line 1
+added line 2
-removed line 1`
    render(<DiffSummary diff={diff} />)
    expect(screen.getByText('2')).toBeInTheDocument() // insertions
    expect(screen.getByText('1')).toBeInTheDocument() // deletions
  })

  it('extracts filenames', () => {
    const diff = `diff --git a/src/components/Feature.tsx b/src/components/Feature.tsx
+content`
    render(<DiffSummary diff={diff} />)
    expect(screen.getByText('src/components/Feature.tsx')).toBeInTheDocument()
  })

  it('handles null diff gracefully', () => {
    const { container } = render(<DiffSummary diff={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('handles empty diff string', () => {
    const { container } = render(<DiffSummary diff="" />)
    expect(container.innerHTML).toBe('')
  })
})
