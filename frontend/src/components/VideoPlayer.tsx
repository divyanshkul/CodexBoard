"use client";

import { resolveOutputPath } from "../lib/api";
import { Video } from "lucide-react";

export function VideoPlayer({
  ticketId,
  videoPath,
}: {
  ticketId: string;
  videoPath: string | null;
}) {
  if (!videoPath) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center flex flex-col items-center gap-2">
        <Video size={20} />
        No video available
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-card overflow-hidden bg-black">
      <video
        src={resolveOutputPath(ticketId, videoPath) ?? undefined}
        controls
        className="w-full"
        preload="metadata"
      >
        Your browser does not support the video element.
      </video>
    </div>
  );
}
