interface VideoPlayerProps {
  src: string | null
  ticketId: string
}

export function VideoPlayer({ src, ticketId }: VideoPlayerProps) {
  if (!src) return null

  const url = `/outputs/${ticketId}/${src}`

  return (
    <div className="space-y-1.5">
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-black">
        <video
          src={url}
          controls
          className="w-full h-auto"
          preload="metadata"
        >
          Your browser does not support video playback.
        </video>
      </div>
    </div>
  )
}
