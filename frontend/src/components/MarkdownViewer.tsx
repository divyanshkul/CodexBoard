import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'

interface MarkdownViewerProps {
  src: string | null
  ticketId: string
}

export function MarkdownViewer({ src, ticketId }: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!src) return
    setLoading(true)
    fetch(`/outputs/${ticketId}/${src}`)
      .then(r => r.text())
      .then(text => setContent(text))
      .catch(() => setContent('Failed to load summary.'))
      .finally(() => setLoading(false))
  }, [src, ticketId])

  if (!src) return null

  if (loading) {
    return (
      <div className="text-xs text-[var(--color-text-muted)] py-2">
        Loading summary...
      </div>
    )
  }

  if (!content) return null

  return (
    <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-[var(--color-text-primary)] [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-[var(--color-text-primary)] [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-[13px] [&_li]:text-[13px] [&_code]:text-xs [&_code]:bg-[var(--color-surface-hover)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-[var(--color-surface-active)] [&_pre]:rounded-lg [&_pre]:p-3">
      <Markdown>{content}</Markdown>
    </div>
  )
}
