import { useState } from 'react'
import { Image, Layers } from 'lucide-react'

interface ScreenshotViewerProps {
  before: Record<string, string>
  after: Record<string, string>
  diffs: Record<string, string>
  ticketId: string
}

export function ScreenshotViewer({ before, after, diffs, ticketId }: ScreenshotViewerProps) {
  const routes = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  const [activeRoute, setActiveRoute] = useState(routes[0] || '/')
  const [showDiff, setShowDiff] = useState(false)

  if (routes.length === 0) return null

  const baseUrl = `/outputs/${ticketId}`

  return (
    <div className="space-y-3">
      {/* Route tabs */}
      {routes.length > 1 && (
        <div className="flex gap-1">
          {routes.map(route => (
            <button
              key={route}
              onClick={() => setActiveRoute(route)}
              className={`text-xs px-2 py-1 rounded-md transition-colors font-mono ${
                activeRoute === route
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {route}
            </button>
          ))}
        </div>
      )}

      {/* Before/After pair */}
      <div className="grid grid-cols-2 gap-3">
        {before[activeRoute] && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              <Image size={10} />
              Before
            </div>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface-hover)]">
              <img
                src={`${baseUrl}/${before[activeRoute]}`}
                alt={`Before - ${activeRoute}`}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        )}
        {after[activeRoute] && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              <Image size={10} />
              After
            </div>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface-hover)]">
              <img
                src={`${baseUrl}/${after[activeRoute]}`}
                alt={`After - ${activeRoute}`}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>

      {/* Diff overlay toggle */}
      {diffs[activeRoute] && (
        <div>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
          >
            <Layers size={12} />
            {showDiff ? 'Hide' : 'Show'} pixel diff
          </button>
          {showDiff && (
            <div className="mt-2 border border-[var(--color-border)] rounded-lg overflow-hidden">
              <img
                src={`${baseUrl}/${diffs[activeRoute]}`}
                alt={`Diff - ${activeRoute}`}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
